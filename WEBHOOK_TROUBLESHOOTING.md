# Guía de Troubleshooting - Webhook de Facebook Messenger

## Verificación del Webhook - Paso a Paso

### ✅ Estado Actual del Bot

El webhook está **100% funcional y listo**. Todos los tests pasan:

```
✅ GET con token correcto → 200 OK (retorna challenge)
✅ GET con token incorrecto → 403 Forbidden
✅ POST con firma válida → 200 OK
✅ Validación HMAC-SHA256 → Funcionando
```

---

## Configuración en Facebook Developers

### Paso 1: Acceder a la Configuración del Webhook

1. Ve a [Facebook Developers](https://developers.facebook.com)
2. Selecciona tu App
3. En el menú izquierdo, ve a **Messenger** → **Settings**

### Paso 2: Configurar la URL del Webhook

En la sección **Webhooks**, haz clic en **Edit Subscription** e ingresa:

```
Callback URL: https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook
Verify Token: sillasymesas_webhook_verify_token_2026
```

**⚠️ IMPORTANTE**: Copia exactamente, sin espacios adicionales.

### Paso 3: Seleccionar Campos de Suscripción

En **Subscription Fields**, marca:
- ✅ `messages`
- ✅ `messaging_postbacks`
- ✅ `message_echoes`

### Paso 4: Hacer Clic en "Verify and Save"

Facebook enviará una solicitud GET a tu webhook para verificar que existe y responde correctamente.

---

## Errores Comunes y Soluciones

### Error: "No se pudo validar la URL de devolución de llamada o el token"

**Causas posibles:**

1. **Callback URL incorrecta**
   - ❌ Incorrecto: `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/webhook`
   - ✅ Correcto: `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook`

2. **Verify Token incorrecto**
   - ❌ Incorrecto: `sillasymesas_webhook_verify_token`
   - ✅ Correcto: `sillasymesas_webhook_verify_token_2026`

3. **Timeout temporal de Facebook**
   - Solución: Intenta nuevamente después de 5-10 minutos

4. **Servidor no accesible**
   - Verifica que el servidor esté corriendo
   - Prueba manualmente con curl (ver abajo)

### Error: "Forbidden (403)"

Esto significa que el Verify Token no coincide. Verifica carácter por carácter que sea:
```
sillasymesas_webhook_verify_token_2026
```

---

## Pruebas Manuales

### Test 1: Verificar que el Webhook Responde

```bash
curl "https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook?hub.mode=subscribe&hub.verify_token=sillasymesas_webhook_verify_token_2026&hub.challenge=test123"
```

**Respuesta esperada:**
```
test123
```

**Status esperado:** `200 OK`

---

### Test 2: Verificar Token Incorrecto (Debe Fallar)

```bash
curl "https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test123"
```

**Respuesta esperada:**
```
Forbidden
```

**Status esperado:** `403 Forbidden`

---

### Test 3: Simular Mensaje de Facebook

```bash
# Crear el cuerpo del mensaje
BODY='{"object":"page","entry":[{"messaging":[{"sender":{"id":"123456"},"message":{"text":"Hola bot"}}]}]}'

# Calcular la firma HMAC-SHA256
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "aa0f9e6e360dfec17630bbc493188ac7" | sed 's/^.* //')

# Enviar la solicitud
curl -X POST "https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -d "$BODY"
```

**Respuesta esperada:**
```
ok
```

**Status esperado:** `200 OK`

---

## Después de Verificar el Webhook

Una vez que Facebook verifique exitosamente el webhook:

### 1. Suscribir la Página

En **Webhooks** → **Select a Page to subscribe your webhook to the Page events**, selecciona tu página y haz clic en **Subscribe**.

### 2. Probar con un Mensaje Real

1. Ve a tu página de Facebook
2. Abre el Messenger
3. Envía un mensaje a tu página
4. El bot debería responder automáticamente

### 3. Monitorear en el Dashboard

Accede al dashboard para ver la actividad:
```
https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/dashboard
```

---

## Verificación de Seguridad

### Validación HMAC-SHA256

Cada solicitud POST de Facebook incluye un header `X-Hub-Signature-256` que el bot valida:

1. El bot recibe el body de la solicitud
2. Calcula `HMAC-SHA256(body, APP_SECRET)`
3. Compara con la firma en el header
4. Solo procesa si coinciden

**App Secret**: `aa0f9e6e360dfec17630bbc493188ac7`

---

## Información de Referencia

| Parámetro | Valor |
|-----------|-------|
| **Webhook URL** | `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook` |
| **Verify Token** | `sillasymesas_webhook_verify_token_2026` |
| **App Secret** | `aa0f9e6e360dfec17630bbc493188ac7` |
| **Page Access Token** | (Configurado en servidor) |
| **Dashboard** | `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/dashboard` |

---

## Checklist de Configuración

- [ ] Callback URL configurada correctamente en Facebook Developers
- [ ] Verify Token configurado exactamente: `sillasymesas_webhook_verify_token_2026`
- [ ] Subscription Fields seleccionados: messages, messaging_postbacks, message_echoes
- [ ] Webhook verificado exitosamente (status 200 OK)
- [ ] Página suscrita al webhook
- [ ] Mensaje de prueba enviado y respondido
- [ ] Dashboard accesible en `/dashboard`
- [ ] Actividad visible en el dashboard

---

## Soporte Adicional

Si el webhook sigue sin funcionar:

1. **Verifica los logs del servidor**
   - El servidor muestra logs de cada intento de verificación
   - Busca mensajes como `[Webhook] Verification successful` o `[Webhook] Verification failed`

2. **Prueba la conectividad**
   - Asegúrate de que tu conexión a internet sea estable
   - Facebook necesita poder alcanzar la URL públicamente

3. **Reinicia el servidor**
   - A veces un reinicio resuelve problemas de conectividad

4. **Espera 5-10 minutos**
   - Facebook a veces tarda en procesar cambios de configuración

---

**Última actualización**: 15 de Abril de 2026  
**Estado**: ✅ Webhook Funcional - Listo para Producción
