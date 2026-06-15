# 📹 Guía de Sesiones en Vivo

## 🎯 Descripción General

Las sesiones en vivo permiten que los instructores programen clases virtuales en tiempo real con los estudiantes. Los estudiantes pueden registrarse con anticipación y unirse cuando la sesión comience.

---

## 🔄 Flujo Completo del Sistema

### 1️⃣ **Creación de Sesión (Admin/Instructor)**

**Página:** `/admin/live-sessions`

**Proceso:**
1. Admin hace clic en "Crear Sesión"
2. Selecciona un curso existente
3. Define:
   - Título de la sesión
   - Descripción
   - Fecha y hora programada
   - Duración (en minutos)
   - Capacidad máxima de asistentes
4. Backend genera automáticamente:
   - `session_id` único
   - `meeting_url` (actualmente simulado con Daily.co)
   - Estado inicial: "scheduled"

**Endpoint:** `POST /api/live-sessions`

**Datos guardados en MongoDB:**
```json
{
  "session_id": "session_abc123",
  "course_id": "course_xyz",
  "course_title": "Introducción a Python",
  "title": "Clase en vivo: Variables y Tipos de Datos",
  "description": "Repasaremos variables...",
  "instructor_id": "user_admin",
  "instructor_name": "Admin",
  "scheduled_at": "2026-06-20T19:00:00Z",
  "duration": 60,
  "meeting_url": "https://emergent.daily.co/session_abc123",
  "status": "scheduled",
  "max_attendees": 100,
  "current_attendees": 0,
  "created_at": "2026-06-15T03:00:00Z"
}
```

---

### 2️⃣ **Visualización de Sesiones (Estudiantes)**

**Página:** `/live-sessions`

**Proceso:**
1. Frontend carga todas las sesiones con `status=scheduled`
2. Simultáneamente obtiene registros del usuario actual
3. Para cada sesión, verifica si el usuario ya está registrado
4. Muestra:
   - ✅ Badge "Ya estás registrado" + botón "Unirse a la Sesión"
   - 🔘 Botón "Registrarse Ahora" (si no está registrado)
   - 🚫 "Sesión Llena" (si alcanzó capacidad máxima)

**Endpoints usados:**
- `GET /api/live-sessions?status=scheduled`
- `GET /api/live-sessions/my-registrations`

---

### 3️⃣ **Registro a una Sesión (Estudiantes)**

**Proceso:**
1. Estudiante hace clic en "Registrarse Ahora"
2. Backend valida:
   - ✅ Sesión existe
   - ✅ No está llena (`current_attendees < max_attendees`)
   - ✅ Usuario no está ya registrado
3. Backend crea registro y actualiza:
   - Incrementa `current_attendees` en 1
   - Guarda registro en `session_registrations`
   - Crea notificación para el usuario
4. Frontend actualiza UI inmediatamente:
   - Muestra badge "Ya estás registrado"
   - Muestra botón "Unirse a la Sesión"
   - Actualiza contador de registrados

**Endpoint:** `POST /api/live-sessions/{session_id}/register`

**Registro guardado:**
```json
{
  "user_id": "user_estudiante",
  "session_id": "session_abc123",
  "registered_at": "2026-06-15T03:10:00Z"
}
```

**Notificación creada:**
```json
{
  "notification_id": "notif_xyz",
  "user_id": "user_estudiante",
  "type": "live_session",
  "content": "Te registraste para la sesión en vivo: Clase en vivo: Variables y Tipos de Datos",
  "related_id": "session_abc123",
  "read": false,
  "created_at": "2026-06-15T03:10:00Z"
}
```

---

### 4️⃣ **Unirse a la Sesión (Día de la clase)**

**Proceso:**
1. Estudiante registrado ve el botón "Unirse a la Sesión"
2. Al hacer clic, se abre el `meeting_url` en una nueva pestaña
3. El estudiante se conecta a la videollamada

**Nota actual:** El `meeting_url` es simulado. Para producción, se debe integrar con:
- **Daily.co** (videollamadas)
- **Zoom API**
- **Google Meet API**
- **Jitsi** (open source)

---

## 📊 Colecciones de MongoDB

### `live_sessions`
Almacena todas las sesiones programadas.

### `session_registrations`
Almacena qué usuarios se registraron a qué sesiones.

**Índices recomendados:**
- `{ "user_id": 1, "session_id": 1 }` (único)
- `{ "session_id": 1 }`
- `{ "user_id": 1 }`

---

## 🔧 Estados de Sesiones

| Estado | Descripción |
|--------|-------------|
| `scheduled` | Sesión programada para el futuro |
| `live` | Sesión en curso |
| `completed` | Sesión finalizada |
| `cancelled` | Sesión cancelada |

---

## 🎨 Características de UI

### Para Estudiantes:
- ✅ Ver todas las sesiones programadas
- ✅ Registrarse con un clic
- ✅ Ver estado de registro
- ✅ Unirse cuando llegue la hora
- ✅ Ver información: fecha, hora, duración, instructor
- ✅ Ver cuántos estudiantes están registrados

### Para Admin:
- ✅ Crear sesiones vinculadas a cursos
- ✅ Ver lista de sesiones creadas
- ✅ Ver contador de registrados
- ✅ (Futuro) Editar o cancelar sesiones
- ✅ (Futuro) Ver lista de asistentes registrados

---

## 🚀 Mejoras Futuras Recomendadas

### Prioridad Alta:
1. **Integración real de videollamadas** (Daily.co o Zoom)
2. **Recordatorios automáticos** (email/notificación 1 hora antes)
3. **Página de detalle de sesión individual** (`/live-sessions/:sessionId`)
4. **Cancelación de registro** para estudiantes
5. **Edición de sesiones** para admin

### Prioridad Media:
6. **Grabación automática** de sesiones
7. **Chat en vivo** durante la sesión
8. **Encuesta post-sesión** (feedback)
9. **Asistencia automática** (quién realmente asistió vs. registrado)
10. **Sesiones recurrentes** (mismo horario cada semana)

### Prioridad Baja:
11. **Compartir sesión** en redes sociales
12. **Calendario de sesiones** (vista mensual)
13. **Sesiones privadas** (solo por invitación)
14. **Co-hosts** (múltiples instructores)

---

## 🐛 Problema Resuelto

**Bug anterior:** Cuando un estudiante hacía clic en "Registrarse", el sistema intentaba redirigir a `/live-sessions/:sessionId` (ruta inexistente), causando comportamiento inesperado.

**Solución aplicada:**
- ✅ Eliminada navegación después del registro
- ✅ UI se actualiza en la misma página
- ✅ Nuevo endpoint `/api/live-sessions/my-registrations` para verificar registros
- ✅ Badge verde "Ya estás registrado" muestra estado
- ✅ Botón "Unirse a la Sesión" aparece cuando ya está registrado

---

## 📝 Endpoints Disponibles

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/live-sessions` | Lista todas las sesiones | Público |
| GET | `/api/live-sessions?status=scheduled` | Sesiones programadas | Público |
| GET | `/api/live-sessions/my-registrations` | Registros del usuario actual | Usuario |
| GET | `/api/live-sessions/{session_id}` | Detalle de una sesión | Público |
| POST | `/api/live-sessions` | Crear sesión | Admin |
| POST | `/api/live-sessions/{session_id}/register` | Registrarse a sesión | Usuario |
| GET | `/api/live-sessions/{session_id}/registrations` | Ver registrados | Admin |

---

## 💡 Cómo Probar

### Como Admin:
1. Inicia sesión: `admin@cursos.com` / `Admin123!`
2. Ve a "Gestionar Sesiones" en el sidebar
3. Crea una nueva sesión para un curso existente
4. Define fecha futura y capacidad

### Como Estudiante:
1. Inicia sesión: `estudiante@test.com` / `Test123!`
2. Ve a "Sesiones en Vivo" en el sidebar
3. Verás las sesiones programadas
4. Haz clic en "Registrarse Ahora"
5. Verás el badge verde "Ya estás registrado"
6. Haz clic en "Unirse a la Sesión" para abrir el link (simulado)

---

## ⚠️ Notas Importantes

1. **Meeting URL simulado:** Actualmente genera URLs de Daily.co ficticias. Para producción, necesitas:
   - API key de Daily.co (o plataforma elegida)
   - Crear rooms reales vía API
   - Configurar permisos y duración

2. **Notificaciones:** El sistema crea notificaciones al registrarse, pero no hay emails automáticos ni recordatorios.

3. **Zona horaria:** Todas las fechas se guardan en UTC. El frontend las convierte al horario local del usuario.

4. **Capacidad:** Una vez llena la sesión, no se permiten más registros.

---

Última actualización: 15 de junio, 2026
