# Configuración Last.fm API

## 📋 Descripción

El servicio ahora usa **Last.fm API** como fuente principal para encontrar artistas similares, reemplazando las recomendaciones deprecadas de Spotify.

## 🔧 Configuración

### 1. Obtener API Key de Last.fm

1. Visita: https://www.last.fm/api/
2. Haz clic en "Get an API account"
3. Completa el formulario de registro
4. Se te proporcionará una **API Key** y un **Shared Secret**

### 2. Configurar en .env

Añade las siguientes líneas a tu archivo `.env`:

```bash
LASTFM_API_KEY=tu_api_key_aqui
LASTFM_SHARED_SECRET=tu_shared_secret_aqui
```

Ejemplo:
```bash
LASTFM_API_KEY=abc123def456
LASTFM_SHARED_SECRET=xyz789uvw012
```

**Nota:** El `SHARED_SECRET` se usa para autenticación avanzada y firmas de requests. Por ahora, el servicio usa principalmente el `API_KEY`, pero el `SHARED_SECRET` está disponible si necesitas implementar autenticación de usuario de Last.fm en el futuro.

## 🔐 API Key vs Shared Secret

### API Key
- ✅ Usado para **lectura pública** de datos
- ✅ Necesario para: artistas similares, top albums, info del artista
- ✅ **Requerido** para que funcione el servicio
- ✅ Se envía en el URL como parámetro

### Shared Secret
- 🔒 Usado para **autenticación privada**
- 🔒 Necesario para: scrobbling, operaciones del usuario, love tracks
- 📋 **Opcional** por ahora (podría usarse en el futuro)
- 📋 Se usa para firmar requests con MD5
- 📋 Más seguro que solo API Key

## 📱 Uso Actual

El servicio actualmente utiliza:
- ✅ `LASTFM_API_KEY` → Para todas las búsquedas de datos públicos
- ⏳ `LASTFM_SHARED_SECRET` → Guardado para implementación futura

## 🚀 Implementación Futura (con Shared Secret)

Si en el futuro quieres agregar:
```javascript
// 1. Obtener información privada del usuario
await getPrivateUserInfo(username);

// 2. Hacer scrobbling (enviar qué está escuchando)
await scrobbleTrack(username, track, artist);

// 3. Marcar track como favorito
await loveTrack(username, track, artist);
```

Necesitarías activar `SHARED_SECRET` para eso.

## ✅ Verificar Configuración

Al iniciar el servidor, verás los logs:

```bash
✅ Last.fm API Key configured
✅ Last.fm Shared Secret configured
```

Si falta algo:
```bash
⚠️ Last.fm API Key not configured - Discovery features may be limited
```

**Solución:** Asegúrate de agregar las variables a `.env` y reinicia el servidor.

## 🔍 Características

El `lastfmService.js` proporciona:

### Funciones Principales

- **`getSimilarArtistsFromLastfm(seedArtists)`** → Encuentra artistas similares basados en los artistas principales del usuario
- **`getArtistTopAlbumsFromLastfm(artistName, limit)`** → Obtiene los álbumes más escuchados de un artista
- **`getArtistInfoFromLastfm(artistName)`** → Información del artista (listeners, playcount, biografía)
- **`getArtistTagsFromLastfm(artistName)`** → Tags/géneros del artista
- **`searchAlbumLastfm(artist, album)`** → Busca un álbum específico

### Caché

- Todos los datos se cachean durante **24 horas**
- El caché se reutiliza automáticamente
- Mejora el rendimiento y reduce llamadas a la API

## 🔄 Flujo de Discovery

1. **Usuario hace login** → Se obtienen sus top artists
2. **Se llama `generateDiscoveryRecommendations()`** → Usa Last.fm como fuente
3. **Last.fm encuentra artistas similares** → Con scores de similaridad
4. **Se buscan álbumes en Spotify** (si es posible) o **Last.fm**
5. **Se cachean los resultados** → Para futuras consultas

## ⚠️ Fallback

Si Last.fm falla por cualquier razón:
- ✅ Automáticamente usa Spotify's related artists (si disponible)
- ✅ Mantiene la compatibilidad

## 📊 Datos Retornados

### Artistas Similares
```javascript
{
  name: "Artist Name",
  similarity: 0.85,
  similarToArtists: ["Your Artist"],
  relevanceScore: 1.85,
  matchCount: 1,
  url: "https://www.last.fm/music/...",
  image: "https://...",
  tags: []
}
```

### Álbumes
```javascript
{
  name: "Album Name",
  artist: "Artist Name",
  playcount: 150000,
  url: "https://...",
  image: "https://...",
  tracks: [...]
}
```

## 🚀 Uso

El servicio se usa automáticamente en `discoveryService.js`:

```javascript
// Obtener recomendaciones de descubrimiento (usa Last.fm internamente)
const recommendations = await generateDiscoveryRecommendations(analysisData);
```

## ✅ Ventajas sobre Spotify API

1. **No deprecada** ✅ Last.fm es estable y activo
2. **Mejor data de similaridad** ✅ Basado en millones de users
3. **Géneros más detallados** ✅ Tags comunitarios
4. **Fallback automático** ✅ Si falla, usa Spotify
5. **Caché eficiente** ✅ Reduce llamadas API

## 🔗 Referencias

- Last.fm API Docs: https://www.last.fm/api
- Métodos disponibles: https://www.last.fm/api/show/artist.getSimilar
