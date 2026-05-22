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
            if (! Schema::hasColumn('client_companies', 'role')) {
                $table->string('role')->default('customer');
            }

            if (! Schema::hasColumn('client_companies', 'hidden')) {
                $table->boolean('hidden')->default(false);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('client_companies')) {
            return;
        }

        Schema::table('client_companies', function (Blueprint $table) {
            if (Schema::hasColumn('client_companies', 'hidden')) {
                $table->dropColumn('hidden');
            }

            if (Schema::hasColumn('client_companies', 'role')) {
                $table->dropColumn('role');
            }
        });
    }
};
