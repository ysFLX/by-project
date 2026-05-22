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
        'meal_unit_price',
        'meal_vat_enabled',
        'active',
        'role',
        'hidden',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected $casts = [
        'active' => 'boolean',
        'hidden' => 'boolean',
        'meal_unit_price' => 'decimal:2',
        'meal_vat_enabled' => 'boolean',
    ];

    public function mealRequests(): HasMany
    {
        return $this->hasMany(MealRequest::class);
    }

    public function people(): HasMany
    {
        return $this->hasMany(CompanyPerson::class);
    }
}
