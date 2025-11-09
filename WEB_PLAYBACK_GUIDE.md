# Guía de Reproducción Web con Spotify

Esta guía explica cómo usar los datos del endpoint `/api/album/:id` para reproducir música desde una aplicación web.

## 📋 Tabla de Contenidos

1. [Opciones de Reproducción](#opciones-de-reproducción)
2. [Spotify Web Playback SDK](#spotify-web-playback-sdk)
3. [Preview de 30 segundos](#preview-de-30-segundos)
4. [Embed con iFrame](#embed-con-iframe)
5. [Redirección a Spotify](#redirección-a-spotify)

---

## Opciones de Reproducción

El endpoint `/api/album/:id` retorna múltiples opciones para reproducir música:

### 1. Spotify Web Playback SDK (Reproducción Completa)
- ✅ **Ventajas**: Reproducción completa de canciones, control total del player
- ❌ **Desventajas**: Requiere que el usuario tenga Spotify Premium y esté autenticado
- 🎯 **Uso recomendado**: Aplicaciones web profesionales con usuarios Premium

### 2. Preview de 30 segundos (Directo)
- ✅ **Ventajas**: No requiere autenticación, funciona para todos
- ❌ **Desventajas**: Solo 30 segundos, no todas las canciones tienen preview
- 🎯 **Uso recomendado**: Vista previa rápida sin autenticación

### 3. Embed con iFrame
- ✅ **Ventajas**: Player completo de Spotify embebido
- ❌ **Desventajas**: Requiere autenticación del usuario con Spotify
- 🎯 **Uso recomendado**: Embeber player completo en tu sitio

### 4. Redirección a Spotify
- ✅ **Ventajas**: Siempre funciona, experiencia nativa de Spotify
- ❌ **Desventajas**: Usuario sale de tu aplicación
- 🎯 **Uso recomendado**: Fallback o botón "Abrir en Spotify"

---

## 🎮 Spotify Web Playback SDK

### Implementación Básica

```javascript
// 1. Cargar el SDK
<script src="https://sdk.scdn.co/spotify-player.js"></script>

// 2. Inicializar el player cuando el SDK esté listo
window.onSpotifyWebPlaybackSDKReady = () => {
  const token = 'TU_ACCESS_TOKEN_DE_SPOTIFY';
  
  const player = new Spotify.Player({
    name: 'Spotify Vinyl Player',
    getOAuthToken: cb => { cb(token); },
    volume: 0.5
  });

  // Conectar el player
  player.connect();

  // Manejar eventos
  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
  });

  player.addListener('player_state_changed', state => {
    console.log(state);
  });
};

// 3. Reproducir una canción usando el URI del endpoint
async function playTrack(spotifyUri, deviceId, accessToken) {
  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [spotifyUri] }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
  });
}

// Ejemplo de uso con los datos del endpoint
const albumData = await fetch('/api/album/ALBUM_ID').then(r => r.json());
const firstTrack = albumData.data.tracks[0];

// Reproducir la primera canción
playTrack(firstTrack.playback.spotifyUri, deviceId, accessToken);
```

### Requisitos

- Usuario debe tener **Spotify Premium**
- Usuario debe estar autenticado con Spotify OAuth
- Necesitas un `access_token` válido con scopes:
  - `streaming`
  - `user-read-email`
  - `user-read-private`

### Ejemplo React

```jsx
import React, { useEffect, useState } from 'react';

function SpotifyPlayer({ albumId }) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [albumData, setAlbumData] = useState(null);

  useEffect(() => {
    // Cargar datos del álbum
    fetch(`/api/album/${albumId}`)
      .then(r => r.json())
      .then(data => setAlbumData(data.data));

    // Inicializar Spotify SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Vinyl Player',
        getOAuthToken: cb => { cb(localStorage.getItem('spotify_token')); },
        volume: 0.5
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        setDeviceId(device_id);
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
    };

    return () => {
      player?.disconnect();
    };
  }, [albumId]);

  const playTrack = async (trackUri) => {
    const token = localStorage.getItem('spotify_token');
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [trackUri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  };

  return (
    <div>
      <h2>{albumData?.name}</h2>
      <div>
        {albumData?.tracks.map(track => (
          <div key={track.id}>
            <span>{track.name}</span>
            <button onClick={() => playTrack(track.playback.spotifyUri)}>
              ▶️ Reproducir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎵 Preview de 30 segundos

La forma más simple de reproducir audio sin autenticación.

### Implementación

```javascript
// Obtener datos del álbum
const albumData = await fetch('/api/album/ALBUM_ID').then(r => r.json());

// Verificar si tiene preview
const track = albumData.data.tracks[0];
if (track.hasPreview) {
  const audio = new Audio(track.playback.previewUrl);
  audio.play();
} else {
  console.log('Esta canción no tiene preview disponible');
}
```

### Ejemplo React con Reproductor Simple

```jsx
import React, { useState, useRef } from 'react';

function SimplePlayer({ albumId }) {
  const [albumData, setAlbumData] = useState(null);
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    fetch(`/api/album/${albumId}`)
      .then(r => r.json())
      .then(data => setAlbumData(data.data));
  }, [albumId]);

  const playPreview = (track) => {
    if (!track.hasPreview) {
      alert('Esta canción no tiene preview disponible');
      return;
    }

    if (playing === track.id) {
      audioRef.current.pause();
      setPlaying(null);
    } else {
      audioRef.current.src = track.playback.previewUrl;
      audioRef.current.play();
      setPlaying(track.id);
    }
  };

  return (
    <div>
      <h2>{albumData?.name}</h2>
      {albumData?.tracks.map(track => (
        <div key={track.id}>
          <span>{track.name}</span>
          {track.hasPreview ? (
            <button onClick={() => playPreview(track)}>
              {playing === track.id ? '⏸️' : '▶️'} Preview
            </button>
          ) : (
            <button disabled>❌ Sin preview</button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🖼️ Embed con iFrame

Incrustar el reproductor completo de Spotify en tu página.

### Implementación

```javascript
const albumData = await fetch('/api/album/ALBUM_ID').then(r => r.json());
const track = albumData.data.tracks[0];

// Para una canción
const embedUrl = track.playback.embedUrl;

// Para el álbum completo
const albumEmbedUrl = albumData.data.playback.embedUrl;
```

### HTML

```html
<!-- Reproducir una canción específica -->
<iframe 
  src="https://open.spotify.com/embed/track/TRACK_ID" 
  width="300" 
  height="380" 
  frameborder="0" 
  allowtransparency="true" 
  allow="encrypted-media">
</iframe>

<!-- Reproducir el álbum completo -->
<iframe 
  src="https://open.spotify.com/embed/album/ALBUM_ID" 
  width="300" 
  height="380" 
  frameborder="0" 
  allowtransparency="true" 
  allow="encrypted-media">
</iframe>
```

### Ejemplo React

```jsx
function SpotifyEmbed({ albumId }) {
  const [albumData, setAlbumData] = useState(null);

  useEffect(() => {
    fetch(`/api/album/${albumId}`)
      .then(r => r.json())
      .then(data => setAlbumData(data.data));
  }, [albumId]);

  if (!albumData) return <div>Cargando...</div>;

  return (
    <div>
      <h2>{albumData.name}</h2>
      <iframe
        src={albumData.playback.embedUrl}
        width="300"
        height="380"
        frameBorder="0"
        allowTransparency="true"
        allow="encrypted-media"
        title={`Spotify Player - ${albumData.name}`}
      />
    </div>
  );
}
```

---

## 🔗 Redirección a Spotify

La opción más simple: abrir Spotify directamente.

### Implementación

```javascript
const albumData = await fetch('/api/album/ALBUM_ID').then(r => r.json());

// Abrir en Spotify Web Player
window.open(albumData.data.playback.webPlayerUrl, '_blank');

// O para una canción específica
const track = albumData.data.tracks[0];
window.open(track.playback.webPlayerUrl, '_blank');
```

### Ejemplo de Botón

```jsx
function OpenInSpotifyButton({ albumId }) {
  const [albumData, setAlbumData] = useState(null);

  useEffect(() => {
    fetch(`/api/album/${albumId}`)
      .then(r => r.json())
      .then(data => setAlbumData(data.data));
  }, [albumId]);

  return (
    <button 
      onClick={() => window.open(albumData?.playback.webPlayerUrl, '_blank')}
      disabled={!albumData}
    >
      🎵 Abrir en Spotify
    </button>
  );
}
```

---

## 🎯 Recomendaciones

### Para una Experiencia Básica
1. Usar **preview de 30 segundos** para escucha rápida
2. Botón "Abrir en Spotify" como opción principal

```jsx
function BasicPlayer({ track }) {
  const audioRef = useRef(new Audio());

  const playPreview = () => {
    if (track.hasPreview) {
      audioRef.current.src = track.playback.previewUrl;
      audioRef.current.play();
    }
  };

  return (
    <div>
      <button onClick={playPreview} disabled={!track.hasPreview}>
        {track.hasPreview ? '▶️ Preview' : '❌ Sin preview'}
      </button>
      <button onClick={() => window.open(track.playback.webPlayerUrl, '_blank')}>
        🎵 Abrir en Spotify
      </button>
    </div>
  );
}
```

### Para una Aplicación Profesional
1. Implementar **Spotify Web Playback SDK** para usuarios Premium
2. Fallback a **preview** para usuarios Free
3. Botón "Abrir en Spotify" siempre disponible

```jsx
function ProfessionalPlayer({ track, isPremium }) {
  if (isPremium) {
    return <SpotifySDKPlayer track={track} />;
  }
  
  return (
    <div>
      {track.hasPreview && <PreviewPlayer track={track} />}
      <button onClick={() => window.open(track.playback.webPlayerUrl, '_blank')}>
        🎵 Abrir en Spotify
      </button>
    </div>
  );
}
```

---

## 📚 Referencias

- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Embed Spotify Players](https://developer.spotify.com/documentation/embeds)

---

## ⚠️ Notas Importantes

1. **Spotify Premium**: El Web Playback SDK requiere que el usuario tenga Spotify Premium
2. **Autenticación**: Necesitas implementar Spotify OAuth para usar el SDK
3. **Preview Availability**: No todas las canciones tienen preview de 30 segundos
4. **Rate Limits**: Respeta los límites de la API de Spotify
5. **HTTPS**: El Web Playback SDK solo funciona con HTTPS
