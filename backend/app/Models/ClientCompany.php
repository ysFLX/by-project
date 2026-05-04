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
        'name',
        'contact_name',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function mealRequests(): HasMany
    {
        return $this->hasMany(MealRequest::class);
    }
}
