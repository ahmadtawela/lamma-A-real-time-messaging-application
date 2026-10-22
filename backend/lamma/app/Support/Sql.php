<?php

namespace App\Support;

class Sql
{
    /** Escapes % and _ so user input is matched literally inside LIKE '%...%'. */
    public static function like(string $term): string
    {
        return '%'.addcslashes($term, '%_\\').'%';
    }
}
