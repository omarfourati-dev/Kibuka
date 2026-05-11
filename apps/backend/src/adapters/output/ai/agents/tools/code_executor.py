from __future__ import annotations

import asyncio


async def execute_code(code: str) -> str:
    """Executes Python code in a subprocess. Use with caution — sandbox in production."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "python3",
            "-c",
            code,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
        if proc.returncode == 0:
            return stdout.decode("utf-8", errors="ignore")[:2000]
        return f"Error: {stderr.decode('utf-8', errors='ignore')[:500]}"
    except TimeoutError:
        return "Error: Code execution timed out (10s limit)"
    except Exception as e:
        return f"Error: {e}"
