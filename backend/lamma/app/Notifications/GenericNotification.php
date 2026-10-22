<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class GenericNotification extends Notification
{
    public function __construct(public string $type, public string $body) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return ['type' => $this->type, 'body' => $this->body];
    }
}
