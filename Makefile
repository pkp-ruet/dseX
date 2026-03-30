.PHONY: dev backend frontend install scrape

dev:
	@echo "Starting backend and frontend..."
	@(cd backend && uvicorn main:app --reload) & \
	 (cd frontend && npm run dev)

backend:
	cd backend && uvicorn main:app --reload

frontend:
	cd frontend && npm run dev

install:
	pip install -r requirements.txt
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

scrape:
	python main.py scrape-all
