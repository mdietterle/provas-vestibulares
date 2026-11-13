"""Cria no Stripe os produtos e preços anunciados em /plans e imprime as
variáveis de ambiente para configurar no Render.

Roda só com chave de sandbox (sk_test_...). É idempotente: procura cada preço
pelo lookup_key antes de criar.

Uso (de backend/):
    STRIPE_SECRET_KEY=sk_test_... python scripts/stripe_setup_prices.py
"""
import os
import sys

import stripe

# (env var, lookup_key, nome do produto, valor em centavos, recorrente?)
PRICES = [
    ("STRIPE_PRICE_BASIC", "basic_base_monthly", "Plano Basic (base)", 19900, True),
    ("STRIPE_PRICE_BASIC_SEAT", "basic_seat_monthly", "Plano Basic (por professor)", 990, True),
    ("STRIPE_PRICE_PRO", "pro_base_monthly", "Plano Pro (base)", 39900, True),
    ("STRIPE_PRICE_PRO_SEAT", "pro_seat_monthly", "Plano Pro (por professor)", 2490, True),
    ("STRIPE_PRICE_ENTERPRISE", "enterprise_base_monthly", "Plano Enterprise (base por unidade)", 79900, True),
    ("STRIPE_PRICE_ENTERPRISE_SEAT", "enterprise_seat_monthly", "Plano Enterprise (por professor)", 1990, True),
    ("STRIPE_PRICE_PACK_QUESTIONS", "pack_questions_100", "Pacote: 100 questões geradas com IA", 3900, False),
    ("STRIPE_PRICE_PACK_CORRECTIONS", "pack_corrections_200", "Pacote: 200 correções de discursivas com IA", 5900, False),
    ("STRIPE_PRICE_PACK_MIXED", "pack_mixed_100_200", "Pacote misto: 100 questões + 200 correções", 8900, False),
]


def main() -> int:
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    if not key.startswith("sk_test_"):
        print("Use a chave do sandbox (sk_test_...) em STRIPE_SECRET_KEY. Chave live é recusada.")
        return 1
    stripe.api_key = key

    env_lines = []
    for env_name, lookup_key, product_name, amount, recurring in PRICES:
        found = stripe.Price.list(lookup_keys=[lookup_key], limit=1).data
        if found:
            price = found[0]
            status = "já existia"
        else:
            product = stripe.Product.create(name=product_name)
            params = {
                "product": product.id,
                "currency": "brl",
                "unit_amount": amount,
                "lookup_key": lookup_key,
            }
            if recurring:
                params["recurring"] = {"interval": "month"}
            price = stripe.Price.create(**params)
            status = "criado"
        print(f"{product_name}: {price.id} ({status})")
        env_lines.append(f"{env_name}={price.id}")

    print("\nConfigure no Render (Environment):")
    print("\n".join(env_lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
