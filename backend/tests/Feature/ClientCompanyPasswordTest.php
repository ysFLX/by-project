<?php

namespace Tests\Feature;

use App\Models\ClientCompany;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ClientCompanyPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_change_password_with_current_password(): void
    {
        $company = $this->makeCustomer();

        $this->patchJson("/api/client-companies/{$company->code}/password", [
            'currentPassword' => 'first-pass',
            'password' => 'second-pass',
        ])->assertOk();

        $this->postJson('/api/auth/login', [
            'username' => $company->username,
            'password' => 'second-pass',
        ])->assertOk()
            ->assertJsonPath('user.companyCode', $company->code);
    }

    public function test_customer_password_change_rejects_wrong_current_password(): void
    {
        $company = $this->makeCustomer();

        $this->patchJson("/api/client-companies/{$company->code}/password", [
            'currentPassword' => 'wrong-pass',
            'password' => 'second-pass',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Mevcut sifre hatali.');

        $this->assertTrue(Hash::check('first-pass', $company->fresh()->password_hash));
    }

    public function test_admin_can_replace_customer_password_from_company_update(): void
    {
        $company = $this->makeCustomer();
        $login = $this->postJson('/api/auth/login', [
            'username' => 'maharet-yemek',
            'password' => 'maharet123',
        ])->assertOk();

        $adminCookie = $login->getCookie('maharet_admin_session');

        $this->withCookie($adminCookie->getName(), $adminCookie->getValue())
            ->putJson("/api/client-companies/{$company->id}", [
                'name' => $company->name,
                'password' => 'admin-pass',
            ])->assertOk();

        $this->postJson('/api/auth/login', [
            'username' => $company->username,
            'password' => 'admin-pass',
        ])->assertOk()
            ->assertJsonPath('user.companyCode', $company->code);
    }

    private function makeCustomer(): ClientCompany
    {
        return ClientCompany::create([
            'code' => 'kuzey-teknoloji',
            'username' => 'kuzey-teknoloji',
            'password_hash' => Hash::make('first-pass'),
            'name' => 'Kuzey Teknoloji',
            'contact_name' => 'Elif Demir',
            'active' => true,
            'role' => 'customer',
            'hidden' => false,
        ]);
    }
}
