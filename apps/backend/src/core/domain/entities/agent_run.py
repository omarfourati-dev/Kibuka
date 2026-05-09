from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class AgentStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


@dataclass
class AgentStep:
    id: str
    agent_run_id: str
    step_type: str
    content: str
    tool_name: Optional[str] = None
    tool_args: Optional[dict[str, Any]] = None
    tool_result: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class AgentRun:
    id: str
    space_id: str
    user_id: str
    task: str
    available_tools: list[str] = field(default_factory=list)
    status: AgentStatus = AgentStatus.IDLE
    result: Optional[str] = None
    steps: list[AgentStep] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
