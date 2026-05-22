<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('client_companies')) {
            return;
        }

        Schema::table('client_companies', function (Blueprint $table) {
            if (! Schema::hasColumn('client_companies', 'meal_unit_price')) {
                $table->decimal('meal_unit_price', 10, 2)->default(170);
            }

            if (! Schema::hasColumn('client_companies', 'meal_vat_enabled')) {
                $table->boolean('meal_vat_enabled')->default(false);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('client_companies')) {
            return;
        }

        Schema::table('client_companies', function (Blueprint $table) {
            if (Schema::hasColumn('client_companies', 'meal_vat_enabled')) {
                $table->dropColumn('meal_vat_enabled');
            }

            if (Schema::hasColumn('client_companies', 'meal_unit_price')) {
                $table->dropColumn('meal_unit_price');
            }
        });
    }
};
