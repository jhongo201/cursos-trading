from fastapi import FastAPI, APIRouter, HTTPException, Header, File, UploadFile, Request, Response, Cookie, Query, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import requests
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-demo')

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "curso-platform"
storage_key = None

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "student"
    subscription_status: str = "inactive"
    subscription_expires_at: Optional[str] = None
    created_at: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")
    course_id: str
    title: str
    description: str
    thumbnail: str
    instructor_id: str
    instructor_name: str
    lesson_count: int = 0
    created_at: str

class CourseCreate(BaseModel):
    title: str
    description: str
    thumbnail: str

class Lesson(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lesson_id: str
    course_id: str
    title: str
    video_url: str
    video_type: str
    content: str
    order: int
    duration: Optional[int] = 0
    created_at: str

class LessonCreate(BaseModel):
    title: str
    video_url: Optional[str] = ""
    video_type: str = "external"
    content: str
    order: int
    duration: Optional[int] = 0

class ProgressUpdate(BaseModel):
    lesson_id: str
    completed: bool

class SubscriptionPlan(BaseModel):
    plan_id: str
    name: str
    price: float
    interval: str
    features: List[str]

class CheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str

class GoogleSessionRequest(BaseModel):
    session_id: str

async def get_current_user(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)) -> User:
    token = None
    if session_token:
        token = session_token
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("user_id")
            user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
            if not user_doc:
                raise HTTPException(status_code=401, detail="User not found")
            return User(**user_doc)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt())
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    user_doc = {
        "user_id": user_id,
        "email": req.email,
        "password": hashed.decode(),
        "name": req.name,
        "picture": None,
        "role": "student",
        "subscription_status": "inactive",
        "subscription_expires_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = jwt.encode({
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }, JWT_SECRET, algorithm="HS256")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
    return {"token": token, "user": User(**user)}

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user_doc = await db.users.find_one({"email": req.email})
    if not user_doc or not bcrypt.checkpw(req.password.encode(), user_doc["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = jwt.encode({
        "user_id": user_doc["user_id"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }, JWT_SECRET, algorithm="HS256")
    
    user = await db.users.find_one({"user_id": user_doc["user_id"]}, {"_id": 0, "password": 0})
    return {"token": token, "user": User(**user)}

@api_router.post("/auth/session")
async def google_session(req: GoogleSessionRequest, response: Response):
    try:
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": req.session_id},
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()
        
        user_doc = await db.users.find_one({"email": data["email"]})
        if user_doc:
            await db.users.update_one(
                {"email": data["email"]},
                {"$set": {"name": data["name"], "picture": data["picture"]}}
            )
            user_id = user_doc["user_id"]
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": user_id,
                "email": data["email"],
                "name": data["name"],
                "picture": data["picture"],
                "role": "student",
                "subscription_status": "inactive",
                "subscription_expires_at": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
        
        session_token = data["session_token"]
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7*24*60*60
        )
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password": 0})
        return {"user": User(**user), "token": session_token}
    except Exception as e:
        logger.error(f"Google session error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
        response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/subscriptions/plans")
async def get_plans():
    plans = [
        {
            "plan_id": "monthly",
            "name": "Plan Mensual",
            "price": 29.99,
            "interval": "monthly",
            "features": ["Acceso a todos los cursos", "Certificados", "Soporte prioritario"]
        },
        {
            "plan_id": "annual",
            "name": "Plan Anual",
            "price": 299.99,
            "interval": "annual",
            "features": ["Acceso a todos los cursos", "Certificados", "Soporte prioritario", "Ahorra 2 meses"]
        }
    ]
    return plans

@api_router.post("/subscriptions/checkout")
async def create_checkout(req: CheckoutRequest, current_user: User = Depends(get_current_user)):
    
    plans = {
        "monthly": 29.99,
        "annual": 299.99
    }
    
    if req.plan_id not in plans:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    amount = plans[req.plan_id]
    success_url = f"{req.origin_url}/payment/success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
    cancel_url = f"{req.origin_url}/pricing"
    
    try:
        http_request = Request(scope={"type": "http", "headers": [], "query_string": b""})
        webhook_url = f"{req.origin_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user.user_id,
                "plan_id": req.plan_id
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        transaction_doc = {
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "user_id": current_user.user_id,
            "session_id": session.session_id,
            "amount": amount,
            "currency": "usd",
            "plan_id": req.plan_id,
            "status": "pending",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction_doc)
        
        return {"url": session.url, "session_id": session.session_id}
    except Exception as e:
        logger.error(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/subscriptions/status/{session_id}")
async def check_payment_status(session_id: str, current_user: User = Depends(get_current_user)):
    
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["payment_status"] == "paid":
        return transaction
    
    try:
        http_request = Request(scope={"type": "http", "headers": [], "query_string": b""})
        webhook_url = f"https://placeholder.com/webhook"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        status = await stripe_checkout.get_checkout_status(session_id)
        
        if status.payment_status == "paid" and transaction["payment_status"] != "paid":
            plan_id = transaction["plan_id"]
            expires_delta = timedelta(days=30) if plan_id == "monthly" else timedelta(days=365)
            expires_at = datetime.now(timezone.utc) + expires_delta
            
            await db.users.update_one(
                {"user_id": current_user.user_id},
                {"$set": {
                    "subscription_status": "active",
                    "subscription_expires_at": expires_at.isoformat()
                }}
            )
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "completed",
                    "payment_status": "paid"
                }}
            )
        
        updated_transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        return updated_transaction
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        http_req = Request(scope={"type": "http", "headers": [], "query_string": b""})
        webhook_url = "https://placeholder.com/webhook"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            user_id = webhook_response.metadata.get("user_id")
            plan_id = webhook_response.metadata.get("plan_id")
            
            if user_id and plan_id:
                expires_delta = timedelta(days=30) if plan_id == "monthly" else timedelta(days=365)
                expires_at = datetime.now(timezone.utc) + expires_delta
                
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "subscription_status": "active",
                        "subscription_expires_at": expires_at.isoformat()
                    }}
                )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/courses")
async def get_courses():
    courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    return courses

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str):
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    lessons = await db.lessons.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    course["lessons"] = lessons
    return course

@api_router.post("/courses")
async def create_course(req: CourseCreate, current_user: User = Depends(get_current_user)):
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    course_id = f"course_{uuid.uuid4().hex[:12]}"
    course_doc = {
        "course_id": course_id,
        "title": req.title,
        "description": req.description,
        "thumbnail": req.thumbnail,
        "instructor_id": current_user.user_id,
        "instructor_name": current_user.name,
        "lesson_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course_doc)
    
    course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    return Course(**course)

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, req: CourseCreate, current_user: User = Depends(get_current_user)):
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    course = await db.courses.find_one({"course_id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    await db.courses.update_one(
        {"course_id": course_id},
        {"$set": {
            "title": req.title,
            "description": req.description,
            "thumbnail": req.thumbnail
        }}
    )
    
    updated_course = await db.courses.find_one({"course_id": course_id}, {"_id": 0})
    return Course(**updated_course)

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, current_user: User = Depends(get_current_user)):
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.courses.delete_one({"course_id": course_id})
    await db.lessons.delete_many({"course_id": course_id})
    
    return {"message": "Course deleted"}

@api_router.get("/courses/{course_id}/lessons")
async def get_lessons(course_id: str, current_user: User = Depends(get_current_user)):
    
    if current_user.subscription_status != "active" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Active subscription required")
    
    lessons = await db.lessons.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return lessons

@api_router.post("/courses/{course_id}/lessons")
async def create_lesson(course_id: str, req: LessonCreate, current_user: User = Depends(get_current_user)):
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    lesson_id = f"lesson_{uuid.uuid4().hex[:12]}"
    lesson_doc = {
        "lesson_id": lesson_id,
        "course_id": course_id,
        "title": req.title,
        "video_url": req.video_url,
        "video_type": req.video_type,
        "content": req.content,
        "order": req.order,
        "duration": req.duration,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.lessons.insert_one(lesson_doc)
    
    lesson_count = await db.lessons.count_documents({"course_id": course_id})
    await db.courses.update_one(
        {"course_id": course_id},
        {"$set": {"lesson_count": lesson_count}}
    )
    
    lesson = await db.lessons.find_one({"lesson_id": lesson_id}, {"_id": 0})
    return Lesson(**lesson)

@api_router.put("/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, req: LessonCreate, current_user: User = Depends(get_current_user)):
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    lesson = await db.lessons.find_one({"lesson_id": lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    await db.lessons.update_one(
        {"lesson_id": lesson_id},
        {"$set": {
            "title": req.title,
            "video_url": req.video_url,
            "video_type": req.video_type,
            "content": req.content,
            "order": req.order,
            "duration": req.duration
        }}
    )
    
    updated_lesson = await db.lessons.find_one({"lesson_id": lesson_id}, {"_id": 0})
    return Lesson(**updated_lesson)

@api_router.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, current_user: User = Depends(get_current_user)):
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    lesson = await db.lessons.find_one({"lesson_id": lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    course_id = lesson["course_id"]
    await db.lessons.delete_one({"lesson_id": lesson_id})
    
    lesson_count = await db.lessons.count_documents({"course_id": course_id})
    await db.courses.update_one(
        {"course_id": course_id},
        {"$set": {"lesson_count": lesson_count}}
    )
    
    return {"message": "Lesson deleted"}

@api_router.get("/progress/{course_id}")
async def get_progress(course_id: str, current_user: User = Depends(get_current_user)):
    
    progress = await db.user_progress.find_one(
        {"user_id": current_user.user_id, "course_id": course_id},
        {"_id": 0}
    )
    
    if not progress:
        return {
            "user_id": current_user.user_id,
            "course_id": course_id,
            "completed_lessons": [],
            "progress_percentage": 0
        }
    
    return progress

@api_router.post("/progress/{course_id}")
async def update_progress(course_id: str, req: ProgressUpdate, current_user: User = Depends(get_current_user)):
    
    progress = await db.user_progress.find_one(
        {"user_id": current_user.user_id, "course_id": course_id}
    )
    
    if not progress:
        progress_doc = {
            "progress_id": f"prog_{uuid.uuid4().hex[:12]}",
            "user_id": current_user.user_id,
            "course_id": course_id,
            "completed_lessons": [],
            "progress_percentage": 0,
            "last_accessed": datetime.now(timezone.utc).isoformat()
        }
        await db.user_progress.insert_one(progress_doc)
        progress = progress_doc
    
    completed_lessons = progress.get("completed_lessons", [])
    
    if req.completed and req.lesson_id not in completed_lessons:
        completed_lessons.append(req.lesson_id)
    elif not req.completed and req.lesson_id in completed_lessons:
        completed_lessons.remove(req.lesson_id)
    
    total_lessons = await db.lessons.count_documents({"course_id": course_id})
    progress_percentage = (len(completed_lessons) / total_lessons * 100) if total_lessons > 0 else 0
    
    await db.user_progress.update_one(
        {"user_id": current_user.user_id, "course_id": course_id},
        {"$set": {
            "completed_lessons": completed_lessons,
            "progress_percentage": progress_percentage,
            "last_accessed": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if progress_percentage >= 100:
        existing_cert = await db.certificates.find_one({
            "user_id": current_user.user_id,
            "course_id": course_id
        })
        
        if not existing_cert:
            cert_doc = {
                "certificate_id": f"cert_{uuid.uuid4().hex[:12]}",
                "user_id": current_user.user_id,
                "course_id": course_id,
                "issued_at": datetime.now(timezone.utc).isoformat()
            }
            await db.certificates.insert_one(cert_doc)
    
    updated_progress = await db.user_progress.find_one(
        {"user_id": current_user.user_id, "course_id": course_id},
        {"_id": 0}
    )
    return updated_progress

@api_router.get("/certificates")
async def get_certificates(current_user: User = Depends(get_current_user)):
    
    certificates = await db.certificates.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    for cert in certificates:
        course = await db.courses.find_one({"course_id": cert["course_id"]}, {"_id": 0})
        if course:
            cert["course_title"] = course["title"]
            cert["instructor_name"] = course["instructor_name"]
    
    return certificates

@api_router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{current_user.user_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    
    try:
        result = put_object(path, data, file.content_type or "application/octet-stream")
        
        file_doc = {
            "file_id": f"file_{uuid.uuid4().hex[:12]}",
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": result["size"],
            "uploaded_by": current_user.user_id,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(file_doc)
        
        return {
            "file_id": file_doc["file_id"],
            "url": f"/api/files/{result['path']}",
            "filename": file.filename
        }
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/files/{path:path}")
async def download_file(path: str, authorization: str = Header(None), auth: str = Query(None)):
    auth_header = authorization or (f"Bearer {auth}" if auth else None)
    
    if auth_header:
        try:
            await get_user_from_token(authorization=auth_header)
        except:
            pass
    
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=record.get("content_type", content_type))
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        
        admin_exists = await db.users.find_one({"email": "admin@cursos.com"})
        if not admin_exists:
            hashed = bcrypt.hashpw("Admin123!".encode(), bcrypt.gensalt())
            admin_doc = {
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": "admin@cursos.com",
                "password": hashed.decode(),
                "name": "Admin",
                "picture": None,
                "role": "admin",
                "subscription_status": "active",
                "subscription_expires_at": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(admin_doc)
            logger.info("Admin user created")
        
        student_exists = await db.users.find_one({"email": "estudiante@test.com"})
        if not student_exists:
            hashed = bcrypt.hashpw("Test123!".encode(), bcrypt.gensalt())
            student_doc = {
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": "estudiante@test.com",
                "password": hashed.decode(),
                "name": "Estudiante Test",
                "picture": None,
                "role": "student",
                "subscription_status": "inactive",
                "subscription_expires_at": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(student_doc)
            logger.info("Test student user created")
        
        logger.info("Storage and users initialized")
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
