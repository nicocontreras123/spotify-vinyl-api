# Agregar Usuarios en Modo Desarrollo

## Guía rápida para agregar usuarios de prueba

Mientras tu aplicación esté en **Development Mode**, solo los usuarios que agregues manualmente podrán usarla.

## Pasos:

### 1. Accede al Spotify Developer Dashboard

Ve a: https://developer.spotify.com/dashboard

### 2. Selecciona tu aplicación

- Haz clic en el nombre de tu aplicación (ej: "Spotify Vinyl Recommendations")

### 3. Ve a Settings

- Haz clic en el botón **"Settings"** en la esquina superior derecha

### 4. User Management

- Desplázate hacia abajo hasta encontrar la sección **"User Management"**
- Verás una lista de usuarios actualmente agregados

### 5. Agregar nuevo usuario

- Haz clic en **"Add New User"**
- Completa el formulario:
  - **Name**: Nombre completo del usuario
  - **Email**: Email asociado a la cuenta de Spotify del usuario
- Haz clic en **"Add"**

### 6. Confirma

- El usuario debería aparecer en la lista
- ¡Ese usuario ya puede autenticarse en tu aplicación!

## Importante:

- ✅ El email debe ser el **exacto** con el que el usuario se registró en Spotify
- ✅ Puedes agregar hasta **25 usuarios** en modo desarrollo
- ✅ Los cambios son **inmediatos** - no necesitas reiniciar nada
- ⚠️ Si el usuario tiene problemas, verifica que el email sea correcto
- ⚠️ Para permitir cualquier usuario, necesitas [solicitar extensión de cuota](./SPOTIFY_PRODUCTION.md)

## ¿Qué ve el usuario?

Cuando un usuario **no autorizado** intenta usar la app:
- ❌ Verá error 403 (Forbidden)
- ❌ No podrá ver sus recomendaciones

Cuando un usuario **autorizado** intenta usar la app:
- ✅ Puede autenticarse normalmente
- ✅ Puede ver sus recomendaciones de vinilo

## Solución a largo plazo

Para producción, es mejor [solicitar modo producción](./SPOTIFY_PRODUCTION.md) para que cualquier usuario pueda usar tu app sin restricciones.
