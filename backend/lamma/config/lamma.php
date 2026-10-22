<?php

return [
    // Where the React app lives (used for password-reset links and post-verification redirects).
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    'max_upload_kb' => (int) env('LAMMA_MAX_UPLOAD_KB', 20480),

    // Extensions that are never accepted, whatever the MIME type claims.
    'blocked_extensions' => ['php', 'phtml', 'phar', 'exe', 'bat', 'cmd', 'sh', 'js', 'jar', 'msi', 'com', 'scr', 'vbs', 'html', 'htm', 'svg'],

    // WebRTC. STUN is public; TURN needs your own coturn (static-auth-secret) for users behind strict NATs.
    'webrtc' => [
        'stun' => array_filter(array_map('trim', explode(',', env('STUN_URLS', 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')))),
        'turn' => ['host' => env('TURN_HOST'), 'port' => (int) env('TURN_PORT', 3478), 'secret' => env('TURN_SECRET'), 'ttl' => (int) env('TURN_TTL', 3600)],
    ],

    'status_ttl_hours' => 24,
    'messages_page_size' => 25,
    'reactions' => ['❤️', '😂', '👍', '😢', '😮', '🔥'],
];
