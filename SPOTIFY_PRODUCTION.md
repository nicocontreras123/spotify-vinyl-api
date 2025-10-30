# Pasar la Aplicación de Spotify a Modo Producción

## ¿Por qué necesitas esto?

Por defecto, las aplicaciones de Spotify están en **"Development Mode"** y solo funcionan con usuarios que agregues manualmente (máximo 25 usuarios). Para que cualquier usuario de Spotify pueda usar tu aplicación, necesitas solicitar una **"Quota Extension"**.

## Requisitos previos

Antes de solicitar la extensión, asegúrate de tener:

1. ✅ Una descripción clara de qué hace tu aplicación
2. ✅ URL del sitio web de tu aplicación
3. ✅ Política de privacidad publicada
4. ✅ Términos de servicio (opcional pero recomendado)
5. ✅ La aplicación debe estar funcionando correctamente
6. ✅ No violar ninguna de las [políticas de Spotify](https://developer.spotify.com/policy)

## Pasos para solicitar extensión de cuota

### 1. Ve al Spotify Developer Dashboard

- Ingresa a: https://developer.spotify.com/dashboard
- Selecciona tu aplicación

### 2. Solicita la extensión

- En el menú lateral, busca **"Quota Extension"** o **"Extended Quota Mode"**
- Haz clic en **"Request Extension"**

### 3. Completa el formulario

Deberás proporcionar:

- **App Name**: Spotify Vinyl Recommendations
- **App Description**: Una aplicación que analiza los gustos musicales del usuario en Spotify y recomienda álbumes de vinilo para comprar basándose en sus artistas y canciones más escuchados.
- **Website URL**: Tu URL de producción (ej: https://tu-app.vercel.app)
- **Privacy Policy URL**: URL donde publiques tu política de privacidad
- **Use Case**: Explicar cómo usas los datos de Spotify

Ejemplo de Use Case:
```
Our application analyzes users' top tracks and artists from Spotify to generate
personalized vinyl record purchase recommendations. We use the following scopes:
- user-top-read: To access user's top artists and tracks
- user-read-recently-played: To understand listening history
- user-library-read: To access saved albums

We do not store any user data on our servers. All recommendations are generated
in real-time and displayed directly to the user. We only store authentication
tokens temporarily in localStorage on the client side.
```

### 4. Política de Privacidad

Si no tienes una, puedes crear una simple que incluya:

- Qué datos recopilas (en este caso, datos de Spotify solo durante la sesión)
- Cómo usas los datos (generar recomendaciones)
- Si almacenas datos (en tu caso, NO)
- Cómo los usuarios pueden revocar acceso (desde su cuenta de Spotify)

Ejemplo básico:

```markdown
# Privacy Policy

## Data Collection
We access your Spotify listening data (top tracks, artists, and library) only
when you explicitly authorize our application through Spotify's OAuth flow.

## Data Usage
We use your Spotify data solely to generate personalized vinyl record recommendations.
This data is processed in real-time and is not stored on our servers.

## Data Storage
We do not store any of your personal data or Spotify listening history on our
servers. Authentication tokens are stored temporarily in your browser's
localStorage and can be cleared at any time by logging out.

## Third-Party Services
We use:
- Spotify API: To access your music preferences
- Discogs API: To fetch vinyl record pricing information

## Revoking Access
You can revoke our application's access to your Spotify data at any time by
visiting: https://www.spotify.com/account/apps/

## Contact
For questions, contact: [your-email@example.com]
```

### 5. Tiempo de revisión

- Spotify generalmente responde en **5-7 días hábiles**
- Pueden solicitar información adicional o cambios
- Una vez aprobado, tu app funcionará con cualquier usuario de Spotify

## Alternativa temporal: Agregar usuarios manualmente

Mientras esperas la aprobación, puedes agregar usuarios manualmente:

1. Ve a **Settings** en tu aplicación del Dashboard
2. Baja a **"User Management"**
3. Haz clic en **"Add New User"**
4. Agrega el email y nombre del usuario de Spotify
5. Límite: 25 usuarios

## Notas importantes

- ⚠️ NO solicites más scopes de los que realmente necesitas
- ⚠️ Asegúrate de tener una política de privacidad clara
- ⚠️ La aplicación debe estar funcionando antes de solicitar
- ⚠️ Spotify puede rechazar aplicaciones que violen sus políticas
- ⚠️ Una vez en producción, cualquier cambio en los scopes requiere nueva aprobación

## Scopes que usamos

```javascript
const scopes = [
  'user-top-read',              // Para obtener top tracks y artists
  'user-read-recently-played',  // Para historial de reproducción
  'user-library-read'           // Para biblioteca del usuario
];
```

## Recursos útiles

- [Spotify Developer Policy](https://developer.spotify.com/policy)
- [Spotify Developer Terms](https://developer.spotify.com/terms)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
