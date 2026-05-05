.PHONY: up down build logs restart pull deploy

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

restart:
	docker compose restart

pull:
	git pull

deploy: pull build up
	docker compose logs -f caddy