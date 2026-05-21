<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MealRequest extends Model
{
    use HasFactory;

    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_EATEN = 'eaten';
    public const STATUS_COLLECTED = 'collected';

    protected $fillable = [
        'request_no',
        'client_company_id',
        'service_date',
        'headcount',
        'status',
        'note',
        'eaten_at',
        'collected_at',
    ];

    protected $casts = [
        'service_date' => 'date:Y-m-d',
        'eaten_at' => 'datetime',
        'collected_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(ClientCompany::class, 'client_company_id');
    }

    public function people(): BelongsToMany
    {
        return $this->belongsToMany(CompanyPerson::class, 'meal_request_people')
            ->withTimestamps();
    }
}
