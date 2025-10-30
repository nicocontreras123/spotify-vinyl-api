# Guía de Acceso de Usuarios - Spotify API

## 🚨 Problema: Error 403 al autenticarse

Si ves un error **403 Forbidden** al intentar cargar las recomendaciones, es porque la aplicación de Spotify está en **Development Mode**.

### ¿Qué significa esto?

```
Development Mode (Por defecto)
├── ✅ Funciona con usuarios agregados manualmente
├── ❌ NO funciona con usuarios aleatorios
└── 📊 Límite: 25 usuarios

VS

Extended Quota Mode (Producción)
├── ✅ Funciona con CUALQUIER usuario de Spotify
├── ✅ Sin límite de usuarios
└── ⏱️ Requiere aprobación de Spotify (5-7 días)
```

---

## 🔧 Solución Rápida: Agregar Usuarios Manualmente

### Para desarrollo y pruebas:

1. **Ve al Dashboard de Spotify**
   ```
   https://developer.spotify.com/dashboard
   ```

2. **Selecciona tu app** → Click en "Settings"

3. **User Management** → "Add New User"

4. **Agrega el email exacto** del usuario de Spotify

5. **Listo!** El usuario ya puede autenticarse

📋 Ver guía detallada: [ADD_USERS_DEV.md](./ADD_USERS_DEV.md)

---

## 🚀 Solución Permanente: Modo Producción

### Para que funcione con cualquier usuario:

1. **Prepara tu aplicación**
   - ✅ Política de privacidad publicada
   - ✅ URL de producción funcionando
   - ✅ Descripción clara de tu app

2. **Solicita extensión de cuota**
   - Ve al Dashboard → Tu app → "Quota Extension"
   - Completa el formulario
   - Espera aprobación (5-7 días)

3. **Una vez aprobado**
   - ✅ Cualquier usuario puede usar tu app
   - ✅ Sin límites de usuarios
   - ✅ Listo para producción

📋 Ver guía detallada: [SPOTIFY_PRODUCTION.md](./SPOTIFY_PRODUCTION.md)

---

## 📊 Comparación

| Característica | Development Mode | Extended Quota Mode |
|----------------|------------------|---------------------|
| **Usuarios** | Solo los que agregues | Cualquier usuario |
| **Límite** | 25 usuarios | Sin límite |
| **Aprobación** | No requiere | Requiere (5-7 días) |
| **Uso** | Pruebas y desarrollo | Producción |
| **Requisitos** | Ninguno | Política de privacidad, URL pública |

---

## 🔍 ¿Cómo saber en qué modo estoy?

**Development Mode:**
- ❌ Usuarios no autorizados ven error 403
- ⚠️ Solo funciona con emails agregados manualmente
- 📝 Dice "Development" en el Dashboard

**Extended Quota Mode:**
- ✅ Cualquier usuario puede autenticarse
- 🌍 Listo para público general
- 📝 Dice "Extended Quota" en el Dashboard

---

## 🛠️ Pasos recomendados

### Para desarrollo local:
1. Agrega tu email personal al Dashboard
2. Agrega emails de testers (máximo 25)
3. Prueba la aplicación

### Para producción:
1. Publica tu política de privacidad (usa [PRIVACY_POLICY_TEMPLATE.md](./PRIVACY_POLICY_TEMPLATE.md))
2. Despliega a producción (Vercel/Render)
3. Solicita extensión de cuota
4. Espera aprobación
5. ¡Lanza al público!

---

## 🐛 Troubleshooting

### Error: "403 Forbidden"
**Causa:** Usuario no está en la lista de usuarios permitidos
**Solución:** Agregar el usuario manualmente o solicitar modo producción

### Error: "401 Unauthorized"
**Causa:** Token expirado (tokens duran 1 hora)
**Solución:** Hacer logout y volver a autenticarse

### Error: "Invalid redirect URI"
**Causa:** El redirect URI en el código no coincide con el del Dashboard
**Solución:** Verificar que coincidan exactamente

---

## 📚 Recursos

- [Agregar usuarios en desarrollo](./ADD_USERS_DEV.md)
- [Solicitar modo producción](./SPOTIFY_PRODUCTION.md)
- [Template de política de privacidad](./PRIVACY_POLICY_TEMPLATE.md)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- [Spotify Developer Policy](https://developer.spotify.com/policy)

---

## ❓ FAQ

**P: ¿Cuánto tarda la aprobación?**
R: Típicamente 5-7 días hábiles

**P: ¿Puedo usar la app sin aprobación?**
R: Sí, pero solo con los 25 usuarios que agregues manualmente

**P: ¿Qué pasa si Spotify rechaza mi solicitud?**
R: Te dirán por qué y puedes corregirlo y volver a solicitar

**P: ¿Necesito pagar por el modo producción?**
R: No, es gratis. Solo necesitas cumplir con sus políticas

**P: ¿Los usuarios necesitan hacer algo especial?**
R: No, si estás en modo producción funcionará como cualquier otra app de Spotify
