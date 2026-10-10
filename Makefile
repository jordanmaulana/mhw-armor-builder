ARCH := $(shell uname -m)

upgrade:
	uv sync
	uv lock --upgrade
	uv sync --frozen --no-install-project

audit:
	cd frontend && pnpm audit fix

lint:
	uv run ruff format .
	uv run ruff check . --fix

dev:
	uv run manage.py runserver 8000

mmg:
	uv run manage.py makemigrations

migrate:
	uv run manage.py migrate

tw-run:
	npx @tailwindcss/cli -i ./static/input.css -o ./static/output.css --watch

tw-build:
	npx @tailwindcss/cli -i ./static/input.css -o ./static/output.css

web:
	cd frontend && pnpm run dev

dock:
	docker compose --env-file .env.docker down
	docker compose --env-file .env.docker build
	docker compose --env-file .env.docker up -d
	docker compose --env-file .env.docker logs -f

sh:			# shell into the running backend container (no uv in there — use `python manage.py`)
	docker compose --env-file .env.docker exec backend bash

mg:			# make mg CMD="createsuperuser"
	docker compose --env-file .env.docker exec backend python manage.py $(CMD)

backup:			# nightly via cron; keeps the last 14 dumps in ./backups
	@mkdir -p backups
	@f=backups/$$(date +%F-%H%M).sql.gz; \
	  docker compose --env-file .env.docker exec -T postgres \
	    sh -c 'pg_dump -U "$$POSTGRES_USER" "$$POSTGRES_DB"' | gzip > $$f; \
	  [ "$$(gzip -dc $$f | wc -c)" -gt 1000 ] || { echo "backup failed, $$f has no content"; rm -f $$f; exit 1; }; \
	  echo "wrote $$f"
	@ls -t backups/*.sql.gz | tail -n +15 | while read -r old; do rm -f "$$old"; done
