<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CompanyPerson extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_company_id',
        'name',
        'department',
        'employee_code',
        'notes',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(ClientCompany::class, 'client_company_id');
    }

    public function mealRequests(): BelongsToMany
    {
        return $this->belongsToMany(MealRequest::class, 'meal_request_people')
            ->withTimestamps();
    }
}
