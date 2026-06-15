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
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    average_rating: float = 0.0
    total_ratings: int = 0
    created_at: str

class CourseCreate(BaseModel):
    title: str
    description: str
    thumbnail: str
    category_id: Optional[str] = None

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

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    comment_id: str
    lesson_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    content: str
    created_at: str

class CommentCreate(BaseModel):
    content: str

class Rating(BaseModel):
    model_config = ConfigDict(extra="ignore")
    rating_id: str
    course_id: str
    user_id: str
    rating: int
    review: Optional[str] = None
    created_at: str

class RatingCreate(BaseModel):
    rating: int
    review: Optional[str] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str
    name: str
    description: str
    icon: str
    created_at: str

class CategoryCreate(BaseModel):
    name: str
    description: str
    icon: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str
    user_id: str
    type: str
    content: str
    related_id: Optional[str] = None
    read: bool = False
    created_at: str

class Achievement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    achievement_id: str
    name: str
    description: str
    icon: str
    condition_type: str
    condition_value: int

class UserAchievement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    achievement_id: str
    achievement_name: str
    achievement_description: str
    achievement_icon: str
    earned_at: str

class LiveSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    course_id: str
    course_title: str
    title: str
    description: str
    instructor_id: str
    instructor_name: str
    scheduled_at: str
    duration: int
    meeting_url: Optional[str] = None
    status: str
    max_attendees: int
    current_attendees: int
    created_at: str

class LiveSessionCreate(BaseModel):
    course_id: str
    title: str
    description: str
    scheduled_at: str
    duration: int
    max_attendees: int = 100

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
    
    category_name = None
    if req.category_id:
        category = await db.categories.find_one({"category_id": req.category_id}, {"_id": 0})
        if category:
            category_name = category["name"]
    
    course_doc = {
        "course_id": course_id,
        "title": req.title,
        "description": req.description,
        "thumbnail": req.thumbnail,
        "instructor_id": current_user.user_id,
        "instructor_name": current_user.name,
        "lesson_count": 0,
        "category_id": req.category_id,
        "category_name": category_name,
        "average_rating": 0.0,
        "total_ratings": 0,
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
    
    category_name = None
    if req.category_id:
        category = await db.categories.find_one({"category_id": req.category_id}, {"_id": 0})
        if category:
            category_name = category["name"]
    
    await db.courses.update_one(
        {"course_id": course_id},
        {"$set": {
            "title": req.title,
            "description": req.description,
            "thumbnail": req.thumbnail,
            "category_id": req.category_id,
            "category_name": category_name
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
            
            # Check for achievements
            await check_and_award_achievements(current_user.user_id)
    
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


# Categories endpoints
@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories")
async def create_category(req: CategoryCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    category_id = f"cat_{uuid.uuid4().hex[:12]}"
    category_doc = {
        "category_id": category_id,
        "name": req.name,
        "description": req.description,
        "icon": req.icon,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(category_doc)
    
    category = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    return Category(**category)

# Ratings endpoints
@api_router.get("/courses/{course_id}/ratings")
async def get_course_ratings(course_id: str):
    ratings = await db.ratings.find({"course_id": course_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return ratings

@api_router.post("/courses/{course_id}/ratings")
async def create_rating(course_id: str, req: RatingCreate, current_user: User = Depends(get_current_user)):
    existing = await db.ratings.find_one({"course_id": course_id, "user_id": current_user.user_id})
    
    if existing:
        await db.ratings.update_one(
            {"course_id": course_id, "user_id": current_user.user_id},
            {"$set": {"rating": req.rating, "review": req.review}}
        )
    else:
        rating_doc = {
            "rating_id": f"rating_{uuid.uuid4().hex[:12]}",
            "course_id": course_id,
            "user_id": current_user.user_id,
            "rating": req.rating,
            "review": req.review,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.ratings.insert_one(rating_doc)
    
    # Update course average rating
    ratings = await db.ratings.find({"course_id": course_id}, {"_id": 0}).to_list(1000)
    if ratings:
        avg_rating = sum(r["rating"] for r in ratings) / len(ratings)
        await db.courses.update_one(
            {"course_id": course_id},
            {"$set": {"average_rating": avg_rating, "total_ratings": len(ratings)}}
        )
    
    return {"message": "Rating submitted"}

# Comments endpoints
@api_router.get("/lessons/{lesson_id}/comments")
async def get_lesson_comments(lesson_id: str):
    comments = await db.comments.find({"lesson_id": lesson_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return comments

@api_router.post("/lessons/{lesson_id}/comments")
async def create_comment(lesson_id: str, req: CommentCreate, current_user: User = Depends(get_current_user)):
    comment_doc = {
        "comment_id": f"comment_{uuid.uuid4().hex[:12]}",
        "lesson_id": lesson_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "content": req.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_doc)
    
    # Get lesson and course info for notification
    lesson = await db.lessons.find_one({"lesson_id": lesson_id}, {"_id": 0})
    if lesson:
        course = await db.courses.find_one({"course_id": lesson["course_id"]}, {"_id": 0})
        if course and course["instructor_id"] != current_user.user_id:
            # Notify course instructor
            notif_doc = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": course["instructor_id"],
                "type": "comment",
                "content": f"{current_user.name} comentó en la lección '{lesson['title']}'",
                "related_id": lesson_id,
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notif_doc)
    
    comment = await db.comments.find_one({"comment_id": comment_doc["comment_id"]}, {"_id": 0})
    return Comment(**comment)

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    comment = await db.comments.find_one({"comment_id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment["user_id"] != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.comments.delete_one({"comment_id": comment_id})
    return {"message": "Comment deleted"}

# Notifications endpoints
@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user.user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": current_user.user_id},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: User = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": current_user.user_id, "read": False})
    return {"count": count}

# Achievements endpoints
@api_router.get("/achievements")
async def get_achievements():
    achievements = await db.achievements.find({}, {"_id": 0}).to_list(1000)
    return achievements

@api_router.get("/achievements/user")
async def get_user_achievements(current_user: User = Depends(get_current_user)):
    user_achievements = await db.user_achievements.find(
        {"user_id": current_user.user_id}, 
        {"_id": 0}
    ).to_list(1000)
    
    # Enrich with achievement details
    for ua in user_achievements:
        achievement = await db.achievements.find_one({"achievement_id": ua["achievement_id"]}, {"_id": 0})
        if achievement:
            ua["achievement_name"] = achievement["name"]
            ua["achievement_description"] = achievement["description"]
            ua["achievement_icon"] = achievement["icon"]
    
    return user_achievements

async def check_and_award_achievements(user_id: str):
    """Check if user qualifies for new achievements"""
    # Count completed courses
    progress_docs = await db.user_progress.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    completed_courses = sum(1 for p in progress_docs if p.get("progress_percentage", 0) >= 100)
    
    achievements_to_check = [
        ("ach_first_course", "courses_completed", 1),
        ("ach_5_courses", "courses_completed", 5),
        ("ach_10_courses", "courses_completed", 10),
    ]
    
    for ach_id, condition_type, required in achievements_to_check:
        if condition_type == "courses_completed" and completed_courses >= required:
            # Check if already earned
            existing = await db.user_achievements.find_one({"user_id": user_id, "achievement_id": ach_id})
            if not existing:
                user_ach_doc = {
                    "user_id": user_id,
                    "achievement_id": ach_id,
                    "earned_at": datetime.now(timezone.utc).isoformat()
                }
                await db.user_achievements.insert_one(user_ach_doc)
                
                # Create notification
                achievement = await db.achievements.find_one({"achievement_id": ach_id}, {"_id": 0})
                if achievement:
                    notif_doc = {
                        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                        "user_id": user_id,
                        "type": "achievement",
                        "content": f"¡Desbloqueaste el logro '{achievement['name']}'!",
                        "related_id": ach_id,
                        "read": False,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.notifications.insert_one(notif_doc)

# Live Sessions endpoints
@api_router.get("/live-sessions")
async def get_live_sessions(status: Optional[str] = Query(None)):
    query = {}
    if status:
        query["status"] = status
    
    sessions = await db.live_sessions.find(query, {"_id": 0}).sort("scheduled_at", 1).to_list(1000)
    return sessions

@api_router.get("/live-sessions/{session_id}")
async def get_live_session(session_id: str):
    session = await db.live_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@api_router.post("/live-sessions")
async def create_live_session(req: LiveSessionCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    course = await db.courses.find_one({"course_id": req.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    session_id = f"session_{uuid.uuid4().hex[:12]}"
    
    # Generate Daily.co room (simulated - in production use Daily.co API)
    meeting_url = f"https://emergent.daily.co/{session_id}"
    
    session_doc = {
        "session_id": session_id,
        "course_id": req.course_id,
        "course_title": course["title"],
        "title": req.title,
        "description": req.description,
        "instructor_id": current_user.user_id,
        "instructor_name": current_user.name,
        "scheduled_at": req.scheduled_at,
        "duration": req.duration,
        "meeting_url": meeting_url,
        "status": "scheduled",
        "max_attendees": req.max_attendees,
        "current_attendees": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.live_sessions.insert_one(session_doc)
    
    session = await db.live_sessions.find_one({"session_id": session_id}, {"_id": 0})
    return LiveSession(**session)

@api_router.post("/live-sessions/{session_id}/register")
async def register_for_session(session_id: str, current_user: User = Depends(get_current_user)):
    session = await db.live_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["current_attendees"] >= session["max_attendees"]:
        raise HTTPException(status_code=400, detail="Session is full")
    
    # Check if already registered
    existing = await db.session_registrations.find_one({
        "session_id": session_id,
        "user_id": current_user.user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already registered")
    
    reg_doc = {
        "user_id": current_user.user_id,
        "session_id": session_id,
        "registered_at": datetime.now(timezone.utc).isoformat()
    }
    await db.session_registrations.insert_one(reg_doc)
    
    # Update attendee count
    await db.live_sessions.update_one(
        {"session_id": session_id},
        {"$inc": {"current_attendees": 1}}
    )
    
    # Create notification
    notif_doc = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": current_user.user_id,
        "type": "live_session",
        "content": f"Te registraste para la sesión en vivo: {session['title']}",
        "related_id": session_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notif_doc)
    
    return {"message": "Registered successfully", "meeting_url": session["meeting_url"]}

@api_router.get("/live-sessions/{session_id}/registrations")
async def get_session_registrations(session_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    registrations = await db.session_registrations.find(
        {"session_id": session_id}, 
        {"_id": 0}
    ).to_list(1000)
    return registrations

@api_router.get("/certificates/{certificate_id}/share")
async def get_certificate_share_url(certificate_id: str, current_user: User = Depends(get_current_user)):
    """Generate shareable URL for certificate"""
    cert = await db.certificates.find_one({"certificate_id": certificate_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if cert["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get course info
    course = await db.courses.find_one({"course_id": cert["course_id"]}, {"_id": 0})
    
    base_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://edu-member.preview.emergentagent.com')
    share_url = f"{base_url}/certificate/{certificate_id}"
    
    return {
        "share_url": share_url,
        "course_title": course["title"] if course else "Curso",
        "user_name": current_user.name,
        "twitter_text": f"¡Acabo de completar el curso '{course['title'] if course else 'curso'}' en Cursos! 🎓",
        "linkedin_text": f"Orgulloso de haber completado el curso {course['title'] if course else 'curso'}"
    }

# Analytics endpoints
@api_router.get("/admin/analytics")
async def get_analytics(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    active_subscriptions = await db.users.count_documents({"subscription_status": "active"})
    total_courses = await db.courses.count_documents({})
    total_lessons = await db.lessons.count_documents({})
    
    # Revenue calculation
    transactions = await db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0}).to_list(10000)
    total_revenue = sum(t.get("amount", 0) for t in transactions)
    monthly_revenue = sum(t.get("amount", 0) for t in transactions if t.get("plan_id") == "monthly")
    annual_revenue = sum(t.get("amount", 0) for t in transactions if t.get("plan_id") == "annual")
    
    # Recent registrations
    recent_users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).limit(30).to_list(30)
    
    # Conversion rate
    conversion_rate = (active_subscriptions / total_users * 100) if total_users > 0 else 0
    
    return {
        "total_users": total_users,
        "active_subscriptions": active_subscriptions,
        "inactive_users": total_users - active_subscriptions,
        "total_courses": total_courses,
        "total_lessons": total_lessons,
        "total_revenue": round(total_revenue, 2),
        "monthly_revenue": round(monthly_revenue, 2),
        "annual_revenue": round(annual_revenue, 2),
        "conversion_rate": round(conversion_rate, 2),
        "recent_users": recent_users[:10]
    }

# Search and filter endpoints
@api_router.get("/courses/search")
async def search_courses(
    q: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    sort: Optional[str] = Query("recent")
):
    query = {}
    
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]
    
    if category_id:
        query["category_id"] = category_id
    
    # Sort options
    sort_options = {
        "recent": ("created_at", -1),
        "popular": ("total_ratings", -1),
        "rating": ("average_rating", -1),
        "title": ("title", 1)
    }
    
    sort_field, sort_direction = sort_options.get(sort, ("created_at", -1))
    
    courses = await db.courses.find(query, {"_id": 0}).sort(sort_field, sort_direction).to_list(1000)
    return courses


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
        
        # Create default categories
        categories_count = await db.categories.count_documents({})
        if categories_count == 0:
            default_categories = [
                {"category_id": f"cat_{uuid.uuid4().hex[:12]}", "name": "Programación", "description": "Cursos de desarrollo de software", "icon": "Code", "created_at": datetime.now(timezone.utc).isoformat()},
                {"category_id": f"cat_{uuid.uuid4().hex[:12]}", "name": "Diseño", "description": "Cursos de diseño gráfico y UX/UI", "icon": "Palette", "created_at": datetime.now(timezone.utc).isoformat()},
                {"category_id": f"cat_{uuid.uuid4().hex[:12]}", "name": "Negocios", "description": "Cursos de emprendimiento y gestión", "icon": "Briefcase", "created_at": datetime.now(timezone.utc).isoformat()},
                {"category_id": f"cat_{uuid.uuid4().hex[:12]}", "name": "Marketing", "description": "Cursos de marketing digital", "icon": "TrendingUp", "created_at": datetime.now(timezone.utc).isoformat()},
                {"category_id": f"cat_{uuid.uuid4().hex[:12]}", "name": "Datos", "description": "Cursos de ciencia de datos y análisis", "icon": "BarChart", "created_at": datetime.now(timezone.utc).isoformat()},
            ]
            await db.categories.insert_many(default_categories)
            logger.info("Default categories created")
        
        # Create default achievements
        achievements_count = await db.achievements.count_documents({})
        if achievements_count == 0:
            default_achievements = [
                {"achievement_id": "ach_first_course", "name": "Primer Paso", "description": "Completa tu primer curso", "icon": "Trophy", "condition_type": "courses_completed", "condition_value": 1},
                {"achievement_id": "ach_5_courses", "name": "Estudiante Dedicado", "description": "Completa 5 cursos", "icon": "Award", "condition_type": "courses_completed", "condition_value": 5},
                {"achievement_id": "ach_10_courses", "name": "Maestro del Aprendizaje", "description": "Completa 10 cursos", "icon": "Star", "condition_type": "courses_completed", "condition_value": 10},
                {"achievement_id": "ach_early_bird", "name": "Madrugador", "description": "Asiste a 3 sesiones en vivo", "icon": "Sun", "condition_type": "live_sessions", "condition_value": 3},
                {"achievement_id": "ach_social", "name": "Compartidor Social", "description": "Comparte 3 certificados en redes sociales", "icon": "Share2", "condition_type": "shares", "condition_value": 3},
            ]
            await db.achievements.insert_many(default_achievements)
            logger.info("Default achievements created")
        
        logger.info("Storage and users initialized")
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
