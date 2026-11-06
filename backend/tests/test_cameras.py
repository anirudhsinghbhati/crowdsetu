import pytest

def test_camera_stream_headers(client):
    # Request first chunk of stream
    with client.stream("GET", "/api/cameras/1/stream") as res:
        assert res.status_code == 200
        assert "multipart/x-mixed-replace; boundary=frame" in res.headers["content-type"]
        # Read initial chunk to verify frame header and JPEG data
        chunk = next(res.iter_bytes())
        assert b"--frame" in chunk
        assert b"Content-Type: image/jpeg" in chunk

