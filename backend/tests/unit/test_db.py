"""Unit tests for pitchops.services.db."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from pitchops.services import db


@pytest.mark.asyncio
async def test_insert_incident():
    col = AsyncMock()
    await db.insert_incident(col, {"id": "123"})
    col.insert_one.assert_called_once_with({"id": "123"})


@pytest.mark.asyncio
async def test_list_incidents():
    col = AsyncMock()
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=[{"id": "123"}])
    col.find = MagicMock(return_value=mock_cursor)

    # With venue
    res = await db.list_incidents(col, "metlife", 10)
    assert res == [{"id": "123"}]
    col.find.assert_called_with({"venue_id": "metlife"}, {"_id": 0})
    mock_cursor.to_list.assert_called_with(10)

    # Without venue
    await db.list_incidents(col, None, 5)
    col.find.assert_called_with({}, {"_id": 0})


@pytest.mark.asyncio
async def test_update_incident_status():
    col = AsyncMock()
    mock_result = MagicMock()
    mock_result.matched_count = 1
    col.update_one.return_value = mock_result

    res = await db.update_incident_status(col, "inc1", "RESOLVED")
    assert res is True
    col.update_one.assert_called_once_with(
        {"id": "inc1"}, {"$set": {"status": "RESOLVED"}}
    )

    mock_result.matched_count = 0
    res2 = await db.update_incident_status(col, "inc2", "OPEN")
    assert res2 is False


@pytest.mark.asyncio
async def test_count_incidents():
    col = AsyncMock()
    col.count_documents.return_value = 5
    res = await db.count_incidents(col, {"a": "b"})
    assert res == 5
    col.count_documents.assert_called_once_with({"a": "b"})


@pytest.mark.asyncio
async def test_list_open_incidents():
    col = AsyncMock()
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=[{"id": "1"}])
    col.find = MagicMock(return_value=mock_cursor)

    res = await db.list_open_incidents(col, "sofi", 20)
    assert res == [{"id": "1"}]
    col.find.assert_called_once_with(
        {"venue_id": "sofi", "status": {"$ne": "RESOLVED"}}, {"_id": 0}
    )


@pytest.mark.asyncio
async def test_persist_message():
    col = AsyncMock()
    await db.persist_message(col, "sess1", "user", "hello")
    col.insert_one.assert_called_once()
    args = col.insert_one.call_args[0][0]
    assert args["session_id"] == "sess1"
    assert args["role"] == "user"
    assert args["content"] == "hello"
    assert "ts" in args


@pytest.mark.asyncio
async def test_get_chat_history():
    col = AsyncMock()
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=[{"role": "user"}])
    col.find = MagicMock(return_value=mock_cursor)

    res = await db.get_chat_history(col, "sess1")
    assert res == [{"role": "user"}]
    col.find.assert_called_once_with({"session_id": "sess1"}, {"_id": 0})
    mock_cursor.sort.assert_called_once_with("ts", 1)


@pytest.mark.asyncio
async def test_create_indexes():
    inc_col = AsyncMock()
    msg_col = AsyncMock()
    await db.create_indexes(inc_col, msg_col)
    assert inc_col.create_index.call_count == 2
    assert msg_col.create_index.call_count == 1
