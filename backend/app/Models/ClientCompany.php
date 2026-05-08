<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientCompany extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'username',
        'password_hash',
        'account_type',
        'name',
        'contact_name',
        'phone',
        'email',
        'address',
        'tax_number',
        'notes',
        'active',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function mealRequests(): HasMany
    {
        return $this->hasMany(MealRequest::class);
    }
}
