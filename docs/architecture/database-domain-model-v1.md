# Database Domain Model V1 — AUTUAX Architecture

## 1. Overview & Stack

- **RDBMS Engine:** PostgreSQL 16 Alpine
- **ORM & Migrations:** Drizzle ORM (`drizzle-orm`) & Drizzle Kit (`drizzle-kit`)
- **Package Location:** `packages/database/src/schema/`
- **Isolation Principle:** Structural Multi-Tenancy via scoped `tenant_id` foreign keys and composite unique indexes on all tenant-owned entities.

---

## 2. Entity Relational Architecture

```
                    ┌─────────────────────────┐
                    │         tenants         │
                    └────────────┬────────────┘
         ┌───────────────────────┼───────────────────────┐
         │ (1:N)                 │ (1:N)                 │ (1:N)
         ▼                       ▼                       ▼
   ┌───────────┐           ┌───────────┐           ┌───────────┐
   │ customers │◄────┐     │  drivers  │           │ vehicles  │
   └───────────┘     │     └─────┬─────┘           └─────┬─────┘
                     │ (0..1:N)  │ (0..1:N)              │ (1:N, RESTRICT)
                     └───────────┼───────────────────────┤
                                 ▼                       ▼
┌──────────────────────┐   ┌───────────────────────────────┐   ┌───────────────────────────┐
│ traffic_authorities  │──►│         traffic_fines         │◄──│  equipment_verifications  │
└──────────────────────┘   └───────────────┬───────────────┘   └───────────────────────────┘
                                           │ (1:N, CASCADE)
                                           ▼
                           ┌───────────────────────────────┐
                           │     administrative_cases      │
                           └───────────────────────────────┘
```

---

## 3. Entity Specification & Schema Dictionary

### 3.1 `tenants` (Titular da Conta SaaS)
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `name`: `text NOT NULL`
- `slug`: `text NOT NULL UNIQUE`
- `document`: `text` (CNPJ/CPF do contratante)
- `status`: `text NOT NULL DEFAULT 'active'` (`active`, `suspended`, `archived`)
- `created_at`: `timestamptz NOT NULL DEFAULT now()`
- `updated_at`: `timestamptz NOT NULL DEFAULT now()`

### 3.2 `customers` (Clientes Finais / Unidades Operacionais)
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id`: `uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- `name`: `text NOT NULL`
- `document`: `text` (CNPJ/CPF)
- `document_type`: `text NOT NULL DEFAULT 'cnpj'` (`cnpj`, `cpf`)
- `email`: `text`
- `phone`: `text`
- `status`: `text NOT NULL DEFAULT 'active'`
- `created_at` / `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes:** `(tenant_id)`, `(tenant_id, status)`, Unique `(tenant_id, document)`

### 3.3 `drivers` (Condutores Habilitados)
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id`: `uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- `customer_id`: `uuid REFERENCES customers(id) ON DELETE SET NULL`
- `name`: `text NOT NULL`
- `cpf`: `text NOT NULL` (11 dígitos canônicos)
- `cnh_number`: `text NOT NULL`
- `cnh_category`: `text NOT NULL` (`A`, `B`, `AB`, `C`, `D`, `E`)
- `cnh_expiration`: `date NOT NULL`
- `cnh_first_issue`: `date`
- `points`: `integer NOT NULL DEFAULT 0`
- `status`: `text NOT NULL DEFAULT 'regular'` (`regular`, `suspended`, `cassated`)
- `created_at` / `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes:** `(tenant_id)`, `(customer_id)`, `(tenant_id, status)`, Unique `(tenant_id, cpf)`, Unique `(tenant_id, cnh_number)`

### 3.4 `vehicles` (Veículos da Frota)
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id`: `uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- `customer_id`: `uuid REFERENCES customers(id) ON DELETE SET NULL`
- `plate`: `text NOT NULL` (Placa padrão Mercosul ou tradicional, caixa alta)
- `renavam`: `text NOT NULL` (11 dígitos)
- `chassi`: `text NOT NULL` (17 caracteres VIN)
- `brand`: `text NOT NULL`
- `model`: `text NOT NULL`
- `model_year`: `integer NOT NULL`
- `manufacture_year`: `integer NOT NULL`
- `color`: `text`
- `fuel_type`: `text`
- `status`: `text NOT NULL DEFAULT 'active'`
- `created_at` / `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes:** `(tenant_id)`, `(customer_id)`, `(tenant_id, status)`, Unique `(tenant_id, plate)`, Unique `(tenant_id, renavam)`, Unique `(tenant_id, chassi)`

### 3.5 `traffic_authorities` (Órgãos Autuadores - Tabela de Referência)
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `code`: `text NOT NULL UNIQUE` (Código SENATRAN / RENAINF, ex: `10001`)
- `name`: `text NOT NULL`
- `sphere`: `text NOT NULL` (`federal`, `state`, `municipal`)
- `state`: `text` (UF de jurisdição ou null)
- `municipality`: `text`
- `active`: `boolean NOT NULL DEFAULT true`
- `created_at` / `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes:** `(code)`, `(sphere)`, `(state)`

### 3.6 `equipment_verifications` (Laudos e Aferições Metrológicas INMETRO)
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `equipment_type`: `text NOT NULL` (`radar`, `breathalyzer`, `tachograph`, `scale`)
- `equipment_identifier`: `text NOT NULL`
- `inmetro_number`: `text NOT NULL`
- `verification_date`: `date NOT NULL`
- `valid_until`: `date NOT NULL` (Validade estatutária máxima de 12 meses)
- `status`: `text NOT NULL DEFAULT 'valid'` (`valid`, `expired`, `irregular`)
- `created_at` / `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes:** `(equipment_identifier)`, `(inmetro_number)`, `(valid_until, status)`

### 3.7 `traffic_fines` (Autos de Infração de Trânsito - AIT)
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id`: `uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- `vehicle_id`: `uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT`
- `driver_id`: `uuid REFERENCES drivers(id) ON DELETE SET NULL`
- `traffic_authority_id`: `uuid NOT NULL REFERENCES traffic_authorities(id) ON DELETE RESTRICT`
- `equipment_verification_id`: `uuid REFERENCES equipment_verifications(id) ON DELETE SET NULL`
- `ait_number`: `text NOT NULL`
- `infraction_code`: `text NOT NULL` (Código CTB)
- `infraction_description`: `text NOT NULL`
- `infraction_date`: `timestamptz NOT NULL`
- `location`: `text NOT NULL`
- `city`: `text NOT NULL`
- `state`: `text NOT NULL`
- `speed_limit`: `integer`
- `measured_speed`: `integer`
- `considered_speed`: `integer`
- `points`: `integer NOT NULL DEFAULT 0`
- `amount`: `numeric(10, 2) NOT NULL`
- `discount_amount`: `numeric(10, 2)`
- `notification_date`: `date`
- `defense_deadline`: `date`
- `status`: `text NOT NULL DEFAULT 'detected'` (`detected`, `analyzed`, `drafting`, `submitted`, `deferred`, `indeferred`, `paid`, `cancelled`)
- `created_at` / `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes:** `(tenant_id)`, `(tenant_id, status)`, `(vehicle_id)`, `(driver_id)`, `(traffic_authority_id)`, `(defense_deadline)`, Unique `(tenant_id, ait_number)`

### 3.8 `administrative_cases` (Processos Administrativos de Defesa)
- `id`: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id`: `uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- `traffic_fine_id`: `uuid NOT NULL REFERENCES traffic_fines(id) ON DELETE CASCADE`
- `case_number`: `text NOT NULL`
- `current_instance`: `text NOT NULL DEFAULT 'preliminary_defense'` (`preliminary_defense`, `jari_first_instance`, `cetran_second_instance`)
- `status`: `text NOT NULL DEFAULT 'draft'` (`draft`, `ready_for_review`, `approved`, `submitted`, `in_judgment`, `granted`, `denied`)
- `protocol_number`: `text`
- `protocol_date`: `timestamptz`
- `deadline_date`: `date NOT NULL`
- `notes`: `text`
- `created_at` / `updated_at`: `timestamptz NOT NULL DEFAULT now()`
- **Indexes:** `(tenant_id)`, `(traffic_fine_id)`, `(tenant_id, status)`, `(deadline_date)`, Unique `(tenant_id, case_number)`

---

## 4. Integrity Guardrails & Protections

1. **Deletion Immutability:** A vehicle cannot be deleted while active traffic fines refer to it (`ON DELETE RESTRICT`).
2. **Authority Immutability:** Traffic authorities cannot be removed if referenced by existing infractions (`ON DELETE RESTRICT`).
3. **Multi-Tenant Uniqueness:** Plates, chassis, RENAVAM, CPFs, and CNHs are constrained per `tenant_id`, enabling multiple independent organizations to track shared or reassigned vehicle data without collision or leaks.
4. **Monetary Safety:** Exact decimal representation via `numeric(10, 2)` guarantees zero precision loss for financial accounting and discounts.
