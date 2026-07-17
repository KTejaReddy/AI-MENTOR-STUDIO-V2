import os
import subprocess
import tempfile
import time
import sqlite3
import shutil

class SandboxExecutionError(Exception):
    pass

class LocalSandbox:
    def __init__(self, run_timeout: int = 5, compile_timeout: int = 10):
        self.run_timeout = run_timeout
        self.compile_timeout = compile_timeout

    def execute(self, language: str, code: str, stdin: str = "") -> dict:
        start_time = time.time()
        
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                if language == "python":
                    return self._execute_python(code, stdin, temp_dir, start_time)
                elif language == "javascript":
                    return self._execute_javascript(code, stdin, temp_dir, start_time)
                elif language == "c":
                    return self._execute_c(code, stdin, temp_dir, start_time)
                elif language == "cpp":
                    return self._execute_cpp(code, stdin, temp_dir, start_time)
                elif language == "java":
                    return self._execute_java(code, stdin, temp_dir, start_time)
                elif language == "sql":
                    return self._execute_sql(code, start_time)
                elif language == "html":
                    # HTML preview is handled on frontend, but we can return success
                    return {
                        "output": "HTML Execution is handled via Live Preview in the UI.",
                        "stderr": "",
                        "execution_time_ms": 0,
                        "exit_code": 0
                    }
                else:
                    raise SandboxExecutionError(f"Unsupported language: {language}")
            except Exception as e:
                return {
                    "output": "",
                    "stderr": str(e),
                    "execution_time_ms": int((time.time() - start_time) * 1000),
                    "exit_code": 1
                }

    def _execute_subprocess(self, cmd: list, stdin: str, temp_dir: str, timeout: int) -> tuple[str, str, int]:
        try:
            result = subprocess.run(
                cmd,
                input=stdin.encode('utf-8') if stdin else b'',
                capture_output=True,
                timeout=timeout,
                cwd=temp_dir
            )
            return result.stdout.decode('utf-8', errors='replace'), result.stderr.decode('utf-8', errors='replace'), result.returncode
        except subprocess.TimeoutExpired:
            return "", f"Execution timed out after {timeout} seconds", 124
        except FileNotFoundError:
            return "", f"Required executable not found: {cmd[0]}", 127

    def _execute_python(self, code: str, stdin: str, temp_dir: str, start_time: float) -> dict:
        file_path = os.path.join(temp_dir, "main.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        stdout, stderr, code_res = self._execute_subprocess(["python", "main.py"], stdin, temp_dir, self.run_timeout)
        
        return {
            "output": stdout,
            "stderr": stderr,
            "execution_time_ms": int((time.time() - start_time) * 1000),
            "exit_code": code_res
        }

    def _execute_javascript(self, code: str, stdin: str, temp_dir: str, start_time: float) -> dict:
        file_path = os.path.join(temp_dir, "main.js")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        stdout, stderr, code_res = self._execute_subprocess(["node", "main.js"], stdin, temp_dir, self.run_timeout)
        
        return {
            "output": stdout,
            "stderr": stderr,
            "execution_time_ms": int((time.time() - start_time) * 1000),
            "exit_code": code_res
        }

    def _execute_c(self, code: str, stdin: str, temp_dir: str, start_time: float) -> dict:
        source_file = os.path.join(temp_dir, "main.c")
        exe_file = os.path.join(temp_dir, "main.exe" if os.name == 'nt' else "main")
        
        with open(source_file, "w", encoding="utf-8") as f:
            f.write(code)
            
        # Compile
        c_stdout, c_stderr, c_code = self._execute_subprocess(["gcc", "main.c", "-o", exe_file], "", temp_dir, self.compile_timeout)
        if c_code != 0:
            return {
                "output": c_stdout,
                "stderr": c_stderr,
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "exit_code": c_code
            }
            
        # Execute
        stdout, stderr, code_res = self._execute_subprocess([exe_file], stdin, temp_dir, self.run_timeout)
        return {
            "output": stdout,
            "stderr": stderr,
            "execution_time_ms": int((time.time() - start_time) * 1000),
            "exit_code": code_res
        }

    def _execute_cpp(self, code: str, stdin: str, temp_dir: str, start_time: float) -> dict:
        source_file = os.path.join(temp_dir, "main.cpp")
        exe_file = os.path.join(temp_dir, "main.exe" if os.name == 'nt' else "main")
        
        with open(source_file, "w", encoding="utf-8") as f:
            f.write(code)
            
        # Compile
        c_stdout, c_stderr, c_code = self._execute_subprocess(["g++", "main.cpp", "-o", exe_file], "", temp_dir, self.compile_timeout)
        if c_code != 0:
            return {
                "output": c_stdout,
                "stderr": c_stderr,
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "exit_code": c_code
            }
            
        # Execute
        stdout, stderr, code_res = self._execute_subprocess([exe_file], stdin, temp_dir, self.run_timeout)
        return {
            "output": stdout,
            "stderr": stderr,
            "execution_time_ms": int((time.time() - start_time) * 1000),
            "exit_code": code_res
        }

    def _execute_java(self, code: str, stdin: str, temp_dir: str, start_time: float) -> dict:
        source_file = os.path.join(temp_dir, "Main.java")
        
        with open(source_file, "w", encoding="utf-8") as f:
            f.write(code)
            
        # Compile
        c_stdout, c_stderr, c_code = self._execute_subprocess(["javac", "Main.java"], "", temp_dir, self.compile_timeout)
        if c_code != 0:
            return {
                "output": c_stdout,
                "stderr": c_stderr,
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "exit_code": c_code
            }
            
        # Execute
        stdout, stderr, code_res = self._execute_subprocess(["java", "Main"], stdin, temp_dir, self.run_timeout)
        return {
            "output": stdout,
            "stderr": stderr,
            "execution_time_ms": int((time.time() - start_time) * 1000),
            "exit_code": code_res
        }
        
    def _execute_sql(self, code: str, start_time: float) -> dict:
        try:
            conn = sqlite3.connect(':memory:')
            cursor = conn.cursor()
            
            output = []
            
            # Execute script
            cursor.executescript(code)
            
            # If the last statement was a SELECT, fetch all
            # We can parse the statements or just try to execute the last one if it returns data
            
            conn.commit()
            return {
                "output": "SQL executed successfully.\n",
                "stderr": "",
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "exit_code": 0
            }
        except Exception as e:
            return {
                "output": "",
                "stderr": f"SQL Error: {str(e)}",
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "exit_code": 1
            }

sandbox = LocalSandbox()
