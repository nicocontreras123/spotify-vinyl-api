# Spotify Vinyl Recommendation API

API que analiza tu historial de escucha en Spotify y recomienda 20 vinilos para comprar basándose en tus artistas, canciones y álbumes más escuchados.

## Características

- Autenticación OAuth con Spotify
- Análisis de top tracks, artistas y álbumes
- Generación de 20 recomendaciones personalizadas de vinilos
- Resumen de tu perfil musical
- Sistema de puntuación para priorizar recomendaciones

## Requisitos Previos

- Node.js 16 o superior
- Cuenta de Spotify
- Credenciales de Spotify API (Client ID y Client Secret)

## Configuración de Spotify API

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una nueva aplicación
3. Obtén tu `Client ID` y `Client Secret`
4. Agrega `http://127.0.0.1:3000/callback` a las URIs de redirección en la configuración de tu app

### ⚠️ IMPORTANTE: Gestión de Usuarios

**Por defecto, las aplicaciones de Spotify están en "Development Mode"** y solo funcionan con usuarios que agregues manualmente (máximo 25).

Si ves **Error 403 Forbidden** al autenticarte con una cuenta diferente:

- **Para desarrollo:** [Agrega usuarios manualmente](./ADD_USERS_DEV.md)
- **Para producción:** [Solicita modo producción](./SPOTIFY_PRODUCTION.md) (cualquier usuario podrá usarla)

📖 **Guía completa:** [USER_ACCESS_GUIDE.md](./USER_ACCESS_GUIDE.md)

## Instalación

1. Clona el repositorio o navega al directorio del proyecto

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

4. Edita el archivo `.env` con tus credenciales de Spotify:
```env
SPOTIFY_CLIENT_ID=tu_client_id_aqui
SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
DISCOGS_TOKEN=tu_token_de_discogs_aqui
PORT=3000
SESSION_SECRET=tu_secreto_aleatorio_aqui
```

## Configuración de Discogs API (Opcional - Para Precios)

Para obtener información de precios de vinilos en Chile:

1. Ve a [Discogs Developer Settings](https://www.discogs.com/settings/developers)
2. Crea una cuenta si no tienes una
3. Genera un nuevo token personal
4. Copia el token y agrégalo al archivo `.env` como `DISCOGS_TOKEN`

**Nota:** Sin el token de Discogs, la aplicación funcionará normalmente pero no mostrará información de precios.

## Uso

### Iniciar el servidor

```bash
npm start
```

O en modo desarrollo (con auto-reload):
```bash
npm run dev
```

### Flujo de autenticación

1. **Iniciar sesión con Spotify:**
```bash
curl http://localhost:3000/auth/login
```

Esto retornará un JSON con la URL de autorización. Copia esa URL y ábrela en tu navegador.

2. **Autorizar la aplicación:**
Después de autorizar en Spotify, serás redirigido a `/callback` y verás un mensaje de éxito.

3. **Obtener recomendaciones de vinilos:**
```bash
curl http://localhost:3000/api/vinyl-recommendations
```

## Endpoints

### Autenticación

#### `GET /auth/login`
Obtiene la URL de autorización de Spotify.

**Respuesta:**
```json
{
  "message": "Please authorize the application",
  "authUrl": "https://accounts.spotify.com/authorize?..."
}
```

#### `GET /auth/callback`
Callback de OAuth (Spotify redirige aquí después de la autorización).

**Query Params:**
- `code`: Código de autorización de Spotify

**Respuesta:**
```json
{
  "message": "Authentication successful!",
  "expiresIn": 3600
}
```

### Datos y Recomendaciones

#### `GET /api/analysis`
Obtiene el análisis completo de tu música.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "topTracks": [...],
    "topArtists": [...],
    "topAlbums": [...]
  }
}
```

#### `GET /api/album/:id`
Obtiene información detallada de un álbum específico, incluyendo toda la información necesaria para reproducción web.

**Parámetros:**
- `id`: ID del álbum de Spotify

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": "album_id",
    "name": "Album Name",
    "artists": [
      {
        "id": "artist_id",
        "name": "Artist Name",
        "uri": "spotify:artist:xxxxx",
        "externalUrls": { "spotify": "https://..." }
      }
    ],
    "releaseDate": "2020-01-01",
    "totalTracks": 12,
    "images": [{ "url": "...", "height": 640, "width": 640 }],
    "genres": ["rock", "indie"],
    "popularity": 75,
    "uri": "spotify:album:xxxxx",
    "playback": {
      "spotifyUri": "spotify:album:xxxxx",
      "webPlayerUrl": "https://open.spotify.com/album/xxxxx",
      "embedUrl": "https://open.spotify.com/embed/album/xxxxx",
      "canEmbed": true
    },
    "availableMarkets": ["US", "CL", ...],
    "tracks": [
      {
        "id": "track_id",
        "name": "Track Name",
        "track_number": 1,
        "durationMs": 240000,
        "explicit": false,
        "uri": "spotify:track:xxxxx",
        "hasPreview": true,
        "playback": {
          "spotifyUri": "spotify:track:xxxxx",
          "webPlayerUrl": "https://open.spotify.com/track/xxxxx",
          "embedUrl": "https://open.spotify.com/embed/track/xxxxx",
          "previewUrl": "https://p.scdn.co/mp3-preview/...",
          "canEmbed": true
        },
        "isPlayable": true,
        "restrictions": null,
        "artists": [...]
      }
    ]
  }
}
```

**Notas sobre reproducción web:**
- `playback.spotifyUri`: Usar con el [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) para reproducción completa
- `playback.webPlayerUrl`: URL directa para abrir en Spotify Web Player
- `playback.embedUrl`: URL para incrustar con iframe (requiere autenticación del usuario)
- `playback.previewUrl`: URL directa de audio MP3 para preview de 30 segundos (sin autenticación requerida)
- `hasPreview`: Indica si la canción tiene preview disponible
- `isPlayable`: Indica si la canción se puede reproducir en el mercado actual

#### `GET /api/vinyl-recommendations`
Obtiene 20 recomendaciones de vinilos personalizadas.

**Respuesta:**
```json
{
  "success": true,
  "summary": {
    "topGenres": [...],
    "topArtistNames": [...],
    "musicProfile": {...}
  },
  "vinylRecommendations": [
    {
      "rank": 1,
      "albumName": "Album Name",
      "artist": "Artist Name",
      "releaseDate": "2020-01-01",
      "reason": "Album featuring your top tracks",
      "priority": "high",
      "vinylSearchTip": "Search \"Artist Album\" on Discogs..."
    }
  ],
  "totalRecommendations": 20
}
```

## Estructura del Proyecto

```
spotify-vinyl-api/
├── src/
│   ├── config/
│   │   └── spotify.js          # Configuración de Spotify API
│   ├── controllers/
│   │   ├── authController.js   # Lógica de autenticación
│   │   └── recommendationController.js
│   ├── routes/
│   │   ├── authRoutes.js       # Rutas de autenticación
│   │   └── recommendationRoutes.js
│   ├── services/
│   │   ├── spotifyService.js   # Servicio para obtener datos de Spotify
│   │   └── vinylRecommendationService.js  # Lógica de recomendaciones
│   └── server.js               # Servidor principal
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Cómo Funciona el Sistema de Recomendaciones

1. **Análisis de Datos:** Obtiene tus top 50 tracks y top 50 artistas
2. **Extracción de Álbumes:** Identifica álbumes únicos de tus canciones favoritas
3. **Sistema de Puntuación:**
   - Artistas en tu top list reciben más puntos
   - Coincidencias de género aumentan el score
   - Albums con tracks populares tienen prioridad
4. **Generación de Recomendaciones:** Selecciona los 20 mejores vinilos basándose en el score

## Deployment

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions on Render.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information and available endpoints |
| GET | `/auth/login` | Get Spotify authorization URL |
| GET | `/callback` | OAuth callback (Spotify redirect) |
| GET | `/api/analysis` | Get listening analysis data |
| GET | `/api/vinyl-recommendations?timeRange=medium_term` | Get vinyl recommendations |

### Query Parameters

- `timeRange`: `short_term` (1 month), `medium_term` (6 months), or `long_term` (all time)

## Próximas Mejoras

- ✅ Integración con Discogs API para precios de vinilos
- ✅ Soporte para diferentes rangos de tiempo
- Persistencia de datos en base de datos
- Filtros por género, época, precio
- Sistema de favoritos
- Exportar recomendaciones a PDF o CSV

## Notas de Desarrollo

- Los tokens de acceso se almacenan temporalmente en memoria
- Para producción, implementar almacenamiento persistente (Redis, PostgreSQL, etc.)
- Los tokens de Spotify expiran después de 1 hora
- Implementar refresh token automático para sesiones largas
- CORS está configurado para permitir solo dominios autorizados

## 🐛 Troubleshooting

### Error 403 Forbidden
**Problema:** Usuario no puede autenticarse
**Causa:** La aplicación está en Development Mode y el usuario no está en la lista
**Solución:** [Agregar usuario manualmente](./ADD_USERS_DEV.md) o [solicitar modo producción](./SPOTIFY_PRODUCTION.md)

### Error 401 Unauthorized
**Problema:** Token expirado
**Causa:** Los tokens de Spotify expiran cada 1 hora
**Solución:** Hacer logout y volver a autenticarse

### "Invalid redirect URI"
**Problema:** Error en la autenticación de Spotify
**Causa:** El redirect URI en el código no coincide con el del Dashboard
**Solución:** Verificar que coincidan exactamente en el Dashboard y en tu `.env`

📖 **Ver más:** [USER_ACCESS_GUIDE.md](./USER_ACCESS_GUIDE.md)

## Licencia

MIT

## Related

- [Frontend UI](https://github.com/nicocontreras123/spotify-vinyl-ui)
