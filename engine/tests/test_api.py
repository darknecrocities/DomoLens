"""Tests for the DomoLens Python Engine API."""

import pytest
from httpx import ASGITransport, AsyncClient
from domolens_engine.api import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_probe_nonexistent_file():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/media/probe", json={"path": "/nonexistent/video.mp4"})
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_probe_existing_file(tmp_path):
    sample_file = tmp_path / "sample_recording.mp4"
    sample_file.write_bytes(b"mock video data 12345")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/media/probe", json={"path": str(sample_file)})
        assert response.status_code == 200
        data = response.json()
        assert data["exists"] is True
        assert data["size_bytes"] == len(b"mock video data 12345")
        assert data["extension"] == "mp4"
        assert data["filename"] == "sample_recording.mp4"


@pytest.mark.asyncio
async def test_export_render_and_status():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        start_res = await client.post(
            "/export/render",
            json={
                "source_path": "/tmp/test.mp4",
                "resolution": "1080p",
                "zoom_blocks": [
                    {
                        "startTimeMs": 1000,
                        "endTimeMs": 3000,
                        "targetX": 0.5,
                        "targetY": 0.5,
                        "scale": 1.8,
                    }
                ],
            },
        )
        assert start_res.status_code == 200
        job_id = start_res.json()["job_id"]

        status_res = await client.get(f"/export/status/{job_id}")
        assert status_res.status_code == 200
        data = status_res.json()
        assert data["job_id"] == job_id
        assert data["status"] in ("queued", "rendering", "done")


@pytest.mark.asyncio
async def test_ai_suggest_titles():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/ai/suggest-titles",
            json={"name": "Dashboard Tour", "duration_ms": 15000, "click_count": 8},
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["suggestions"]) >= 3
        assert any("Dashboard Tour" in s for s in data["suggestions"])

