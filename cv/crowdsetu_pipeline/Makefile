.PHONY: install lint format test check

install:
	python -m pip install -r requirements-dev.txt

lint:
	ruff check src tests
	black --check src tests

format:
	ruff check --fix src tests
	black src tests

test:
	pytest -q

check: lint test
