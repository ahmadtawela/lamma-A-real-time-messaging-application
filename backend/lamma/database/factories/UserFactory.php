<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<User> */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        $name = fake()->name();

        return [
            'name' => $name,
            'username' => Str::lower(Str::slug($name, '.')).fake()->unique()->numberBetween(10, 99999),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => 'password',           // hashed by the model cast
            'locale' => fake()->randomElement(['ar', 'en']),
            'last_seen_at' => now()->subMinutes(fake()->numberBetween(1, 600)),
            'remember_token' => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['is_admin' => true]);   // is_admin is not fillable, but factories use forceFill
    }
}
