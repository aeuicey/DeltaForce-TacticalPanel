package com.d4820.deltaforce.tacticalmap;

import android.content.Context;
import android.content.res.AssetManager;
import android.os.PowerManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

/**
 * Embedded LAN web server that serves the app bundle (assets/public) and
 * exposes /api/session + /api/state so browsers on the same network can
 * follow (demo) or collaborate on (collab) the host's tactical state.
 */
@CapacitorPlugin(name = "LanServer")
public class LanServerPlugin extends Plugin {

    private static final String TAG_WAKE_LOCK = "deltaforce:LanServer";
    private static final int DEFAULT_PORT = 18080;

    private final Object stateLock = new Object();

    private volatile LanHttpServer server;
    private volatile PowerManager.WakeLock wakeLock;

    private String mode = "collab";
    private int port = DEFAULT_PORT;
    private long rev = 0;
    private String state = null;
    private int viewRev = 0;
    private String view = null;

    @PluginMethod
    public void start(PluginCall call) {
        String newMode = call.getString("mode", "collab");
        int newPort = call.getInt("port", DEFAULT_PORT);
        if (!"demo".equals(newMode) && !"collab".equals(newMode)) {
            call.reject("mode must be \"demo\" or \"collab\"");
            return;
        }

        stopServer();

        synchronized (stateLock) {
            mode = newMode;
            port = newPort;
            rev = 0;
            state = null;
        }

        LanHttpServer newServer = new LanHttpServer(newPort);
        try {
            newServer.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false);
        } catch (IOException e) {
            call.reject("Failed to start LAN server on port " + newPort, e);
            return;
        }
        server = newServer;
        acquireWakeLock();

        JSObject result = new JSObject();
        result.put("running", true);
        result.put("ip", getLocalIpAddress());
        result.put("port", newPort);
        result.put("mode", newMode);
        call.resolve(result);
    }

    @PluginMethod
    public void pushState(PluginCall call) {
        String newState = call.getString("state");
        if (newState == null) {
            call.reject("state is required");
            return;
        }
        long newRev = updateState(newState);
        JSObject result = new JSObject();
        result.put("rev", newRev);
        call.resolve(result);
    }

    @PluginMethod
    public void pushView(PluginCall call) {
        Double centerLat = call.getDouble("centerLat");
        Double centerLng = call.getDouble("centerLng");
        Double zoom = call.getDouble("zoom");
        Integer seq = call.getInt("seq");
        if (centerLat == null || centerLng == null || zoom == null || seq == null) {
            call.reject("centerLat, centerLng, zoom and seq are required");
            return;
        }
        String newView = "{\"lat\":" + centerLat
                + ",\"lng\":" + centerLng
                + ",\"zoom\":" + zoom
                + ",\"seq\":" + seq + "}";
        int newViewRev;
        synchronized (stateLock) {
            view = newView;
            viewRev += 1;
            newViewRev = viewRev;
        }
        JSObject result = new JSObject();
        result.put("viewRev", newViewRev);
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopServer();
        JSObject result = new JSObject();
        result.put("running", false);
        call.resolve(result);
    }

    @PluginMethod
    public void getInfo(PluginCall call) {
        boolean running = server != null && server.isAlive();
        JSObject result = new JSObject();
        result.put("running", running);
        result.put("ip", getLocalIpAddress());
        synchronized (stateLock) {
            result.put("mode", mode);
            result.put("port", port);
            result.put("rev", rev);
            result.put("viewRev", viewRev);
        }
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        stopServer();
        super.handleOnDestroy();
    }

    private long updateState(String newState) {
        synchronized (stateLock) {
            state = newState;
            rev += 1;
            return rev;
        }
    }

    private void stopServer() {
        LanHttpServer s = server;
        server = null;
        if (s != null) {
            s.stop();
        }
        synchronized (stateLock) {
            viewRev = 0;
            view = null;
        }
        releaseWakeLock();
    }

    private void acquireWakeLock() {
        releaseWakeLock();
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        PowerManager.WakeLock lock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, TAG_WAKE_LOCK);
        lock.setReferenceCounted(false);
        lock.acquire();
        wakeLock = lock;
    }

    private void releaseWakeLock() {
        PowerManager.WakeLock lock = wakeLock;
        wakeLock = null;
        if (lock != null && lock.isHeld()) {
            lock.release();
        }
    }

    private void onRemoteState(String newState, long newRev) {
        JSObject data = new JSObject();
        data.put("rev", newRev);
        data.put("state", newState);
        notifyListeners("stateReceived", data);
    }

    private static String getLocalIpAddress() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces != null && interfaces.hasMoreElements()) {
                NetworkInterface networkInterface = interfaces.nextElement();
                Enumeration<InetAddress> addresses = networkInterface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress address = addresses.nextElement();
                    if (!address.isLoopbackAddress()
                            && address instanceof Inet4Address
                            && address.isSiteLocalAddress()) {
                        return address.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) {
            // fall through to loopback
        }
        return "127.0.0.1";
    }

    private static String mimeTypeFor(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    private class LanHttpServer extends NanoHTTPD {

        LanHttpServer(int port) {
            super(port);
        }

        @Override
        public Response serve(IHTTPSession session) {
            String uri = session.getUri();
            Method method = session.getMethod();

            if (uri.startsWith("/api/")) {
                return addCors(handleApi(session, uri, method));
            }

            if (method == Method.OPTIONS) {
                return addCors(newFixedLengthResponse(Response.Status.OK, "text/plain", ""));
            }
            if (method != Method.GET) {
                return addCors(newFixedLengthResponse(
                        Response.Status.METHOD_NOT_ALLOWED, "text/plain", "Method Not Allowed"));
            }
            return addCors(serveStatic(uri));
        }

        private Response handleApi(IHTTPSession session, String uri, Method method) {
            if ("/api/session".equals(uri) && method == Method.GET) {
                JSONObject json = new JSONObject();
                synchronized (stateLock) {
                    try {
                        json.put("mode", mode);
                        json.put("rev", rev);
                        json.put("viewRev", viewRev);
                    } catch (JSONException ignored) {
                    }
                }
                return jsonResponse(Response.Status.OK, json);
            }

            if ("/api/state".equals(uri) && method == Method.GET) {
                JSONObject json = new JSONObject();
                synchronized (stateLock) {
                    try {
                        json.put("rev", rev);
                        json.put("state", state == null ? JSONObject.NULL : state);
                    } catch (JSONException ignored) {
                    }
                }
                return jsonResponse(Response.Status.OK, json);
            }

            if ("/api/view".equals(uri) && method == Method.GET) {
                JSONObject json = new JSONObject();
                synchronized (stateLock) {
                    try {
                        json.put("viewRev", viewRev);
                        json.put("view", view == null ? JSONObject.NULL : view);
                    } catch (JSONException ignored) {
                    }
                }
                return jsonResponse(Response.Status.OK, json);
            }

            if ("/api/state".equals(uri) && method == Method.POST) {
                String currentMode;
                synchronized (stateLock) {
                    currentMode = mode;
                }
                if (!"collab".equals(currentMode)) {
                    JSONObject error = new JSONObject();
                    try {
                        error.put("error", "forbidden in demo mode");
                    } catch (JSONException ignored) {
                    }
                    return jsonResponse(Response.Status.FORBIDDEN, error);
                }
                String body = readPostBody(session);
                if (body == null || body.isEmpty()) {
                    JSONObject error = new JSONObject();
                    try {
                        error.put("error", "empty body");
                    } catch (JSONException ignored) {
                    }
                    return jsonResponse(Response.Status.BAD_REQUEST, error);
                }
                long newRev = updateState(body);
                onRemoteState(body, newRev);
                JSONObject json = new JSONObject();
                try {
                    json.put("rev", newRev);
                } catch (JSONException ignored) {
                }
                return jsonResponse(Response.Status.OK, json);
            }

            JSONObject error = new JSONObject();
            try {
                error.put("error", "not found");
            } catch (JSONException ignored) {
            }
            return jsonResponse(Response.Status.NOT_FOUND, error);
        }

        private String readPostBody(IHTTPSession session) {
            try {
                Map<String, String> files = new HashMap<>();
                session.parseBody(files);
                return files.get("postData");
            } catch (IOException | ResponseException e) {
                return null;
            }
        }

        private Response serveStatic(String uri) {
            String path = uri;
            int queryIndex = path.indexOf('?');
            if (queryIndex >= 0) {
                path = path.substring(0, queryIndex);
            }
            if (path.isEmpty() || "/".equals(path) || path.endsWith("/")) {
                path = path + "index.html";
            }
            // prevent path traversal outside the asset root
            if (path.contains("..")) {
                return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Forbidden");
            }
            if (path.startsWith("/")) {
                path = path.substring(1);
            }

            AssetManager assets = getContext().getAssets();
            Response response = openAsset(assets, "public/" + path, mimeTypeFor(path));
            if (response == null) {
                // SPA fallback: unknown paths serve index.html
                response = openAsset(assets, "public/index.html", "text/html");
            }
            if (response == null) {
                return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not Found");
            }
            return response;
        }

        private Response openAsset(AssetManager assets, String assetPath, String mimeType) {
            try {
                InputStream stream = assets.open(assetPath);
                int length = stream.available();
                return newFixedLengthResponse(Response.Status.OK, mimeType, stream, length);
            } catch (IOException e) {
                return null;
            }
        }

        private Response jsonResponse(Response.IStatus status, JSONObject json) {
            return newFixedLengthResponse(status, "application/json", json.toString());
        }

        private Response addCors(Response response) {
            response.addHeader("Access-Control-Allow-Origin", "*");
            response.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.addHeader("Access-Control-Allow-Headers", "Content-Type");
            response.addHeader("Cache-Control", "no-store");
            return response;
        }
    }
}
