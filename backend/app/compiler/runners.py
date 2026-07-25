import os
import subprocess
import tempfile
import time
import shutil
import logging
from typing import Tuple, Dict, Any, Type
from app.compiler.models import ExecutionResult

logger = logging.getLogger(__name__)

# Check if docker is available
try:
    subprocess.run(["docker", "--version"], capture_output=True, check=True)
    DOCKER_AVAILABLE = True
except (subprocess.CalledProcessError, FileNotFoundError):
    DOCKER_AVAILABLE = False
    logger.warning("Docker is not available on this system. Falling back to local execution engine. "
                   "Warning: Local execution is NOT secure for arbitrary user code.")

class RunnerExecutionError(Exception):
    pass


class BaseRunner:
    """Abstract Base Runner"""
    def __init__(self, run_timeout: int = 5, compile_timeout: int = 10):
        self.run_timeout = run_timeout
        self.compile_timeout = compile_timeout
        
    def execute(self, code: str, stdin: str = "") -> ExecutionResult:
        raise NotImplementedError()


class LocalFallbackRunner(BaseRunner):
    """
    Insecure, host-based execution fallback when Docker isn't available.
    Supports only languages installed on the host.
    """
    def _execute_subprocess(self, cmd: list, stdin: str, temp_dir: str, timeout: int) -> Tuple[str, str, int]:
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


class PythonLocalRunner(LocalFallbackRunner):
    def execute(self, code: str, stdin: str = "") -> ExecutionResult:
        start_time = time.time()
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, "main.py")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
                
            stdout, stderr, code_res = self._execute_subprocess(["python", "main.py"], stdin, temp_dir, self.run_timeout)
            
            # Try to get python version
            v_stdout, _, _ = self._execute_subprocess(["python", "--version"], "", temp_dir, 2)
            version = v_stdout.strip() if v_stdout else "Python 3.x"

            return ExecutionResult(
                stdout=stdout,
                stderr=stderr,
                compile_output="",
                exit_code=code_res,
                time_ms=int((time.time() - start_time) * 1000),
                memory_mb=0.0, # Not easily available without psutil/time
                compiler_version=version
            )


class NodeLocalRunner(LocalFallbackRunner):
    def execute(self, code: str, stdin: str = "") -> ExecutionResult:
        start_time = time.time()
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = os.path.join(temp_dir, "main.js")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
                
            stdout, stderr, code_res = self._execute_subprocess(["node", "main.js"], stdin, temp_dir, self.run_timeout)
            
            v_stdout, _, _ = self._execute_subprocess(["node", "--version"], "", temp_dir, 2)
            version = v_stdout.strip() if v_stdout else "Node.js"

            return ExecutionResult(
                stdout=stdout,
                stderr=stderr,
                compile_output="",
                exit_code=code_res,
                time_ms=int((time.time() - start_time) * 1000),
                memory_mb=0.0,
                compiler_version=version
            )

class GccLocalRunner(LocalFallbackRunner):
    def execute(self, code: str, stdin: str = "") -> ExecutionResult:
        start_time = time.time()
        with tempfile.TemporaryDirectory() as temp_dir:
            source_file = os.path.join(temp_dir, "main.c")
            exe_file = os.path.join(temp_dir, "main.exe" if os.name == 'nt' else "main")
            
            with open(source_file, "w", encoding="utf-8") as f:
                f.write(code)
                
            c_stdout, c_stderr, c_code = self._execute_subprocess(["gcc", "main.c", "-o", exe_file], "", temp_dir, self.compile_timeout)
            
            v_stdout, _, _ = self._execute_subprocess(["gcc", "--version"], "", temp_dir, 2)
            version = v_stdout.split('\\n')[0].strip() if v_stdout else "GCC"

            if c_code != 0:
                return ExecutionResult(
                    stdout="",
                    stderr="",
                    compile_output=c_stderr or c_stdout,
                    exit_code=c_code,
                    time_ms=int((time.time() - start_time) * 1000),
                    memory_mb=0.0,
                    compiler_version=version
                )
                
            stdout, stderr, code_res = self._execute_subprocess([exe_file], stdin, temp_dir, self.run_timeout)
            
            return ExecutionResult(
                stdout=stdout,
                stderr=stderr,
                compile_output=c_stdout + "\\n" + c_stderr,
                exit_code=code_res,
                time_ms=int((time.time() - start_time) * 1000),
                memory_mb=0.0,
                compiler_version=version
            )


class GppLocalRunner(LocalFallbackRunner):
    def execute(self, code: str, stdin: str = "") -> ExecutionResult:
        start_time = time.time()
        with tempfile.TemporaryDirectory() as temp_dir:
            source_file = os.path.join(temp_dir, "main.cpp")
            exe_file = os.path.join(temp_dir, "main.exe" if os.name == 'nt' else "main")
            
            with open(source_file, "w", encoding="utf-8") as f:
                f.write(code)
                
            c_stdout, c_stderr, c_code = self._execute_subprocess(["g++", "main.cpp", "-o", exe_file], "", temp_dir, self.compile_timeout)
            
            v_stdout, _, _ = self._execute_subprocess(["g++", "--version"], "", temp_dir, 2)
            version = v_stdout.split('\\n')[0].strip() if v_stdout else "G++"

            if c_code != 0:
                return ExecutionResult(
                    stdout="",
                    stderr="",
                    compile_output=c_stderr or c_stdout,
                    exit_code=c_code,
                    time_ms=int((time.time() - start_time) * 1000),
                    memory_mb=0.0,
                    compiler_version=version
                )
                
            stdout, stderr, code_res = self._execute_subprocess([exe_file], stdin, temp_dir, self.run_timeout)
            
            return ExecutionResult(
                stdout=stdout,
                stderr=stderr,
                compile_output=c_stdout + "\\n" + c_stderr,
                exit_code=code_res,
                time_ms=int((time.time() - start_time) * 1000),
                memory_mb=0.0,
                compiler_version=version
            )

class JavaLocalRunner(LocalFallbackRunner):
    def execute(self, code: str, stdin: str = "") -> ExecutionResult:
        start_time = time.time()
        with tempfile.TemporaryDirectory() as temp_dir:
            source_file = os.path.join(temp_dir, "Main.java")
            
            with open(source_file, "w", encoding="utf-8") as f:
                f.write(code)
                
            c_stdout, c_stderr, c_code = self._execute_subprocess(["javac", "Main.java"], "", temp_dir, self.compile_timeout)
            
            v_stdout, _, _ = self._execute_subprocess(["javac", "--version"], "", temp_dir, 2)
            version = v_stdout.strip() if v_stdout else "Java"

            if c_code != 0:
                return ExecutionResult(
                    stdout="",
                    stderr="",
                    compile_output=c_stderr or c_stdout,
                    exit_code=c_code,
                    time_ms=int((time.time() - start_time) * 1000),
                    memory_mb=0.0,
                    compiler_version=version
                )
                
            stdout, stderr, code_res = self._execute_subprocess(["java", "Main"], stdin, temp_dir, self.run_timeout)
            
            return ExecutionResult(
                stdout=stdout,
                stderr=stderr,
                compile_output=c_stdout + "\\n" + c_stderr,
                exit_code=code_res,
                time_ms=int((time.time() - start_time) * 1000),
                memory_mb=0.0,
                compiler_version=version
            )

class HTMLFallbackRunner(BaseRunner):
    def execute(self, code: str, stdin: str = "") -> ExecutionResult:
        return ExecutionResult(
            stdout="HTML Execution is handled via Live Preview in the UI.",
            stderr="",
            compile_output="",
            exit_code=0,
            time_ms=0,
            memory_mb=0.0,
            compiler_version="HTML5"
        )


class UnsupportedLocalRunner(BaseRunner):
    def __init__(self, lang_name: str):
        super().__init__()
        self.lang_name = lang_name

    def execute(self, code: str, stdin: str = "") -> ExecutionResult:
        return ExecutionResult(
            stdout="",
            stderr=f"Language '{self.lang_name}' requires Docker execution, but Docker is not available on this host system. Please install Docker to use this language.",
            compile_output="",
            exit_code=1,
            time_ms=0,
            memory_mb=0.0,
            compiler_version="N/A"
        )


# ==========================================
# Docker Runners
# ==========================================

class DockerRunner(BaseRunner):
    """
    Production-ready Docker runner. 
    Runs `docker run --rm -i --cpus=0.5 --memory=256m --network=none -v {temp_dir}:/code {image} {command}`
    """
    def __init__(self, image: str, compile_cmd: list = None, run_cmd: list = None, source_filename: str = "main", run_timeout: int = 5, compile_timeout: int = 10):
        super().__init__(run_timeout, compile_timeout)
        self.image = image
        self.compile_cmd = compile_cmd
        self.run_cmd = run_cmd
        self.source_filename = source_filename

    def _execute_docker_cmd(self, cmd: list, temp_dir: str, stdin: str, timeout: int) -> Tuple[str, str, int]:
        docker_cmd = [
            "docker", "run", "--rm", "-i",
            "--cpus=0.5",
            "--memory=256m",
            "--network=none",
            "-v", f"{temp_dir}:/code",
            "-w", "/code",
            self.image
        ] + cmd
        
        try:
            result = subprocess.run(
                docker_cmd,
                input=stdin.encode('utf-8') if stdin else b'',
                capture_output=True,
                timeout=timeout
            )
            return result.stdout.decode('utf-8', errors='replace'), result.stderr.decode('utf-8', errors='replace'), result.returncode
        except subprocess.TimeoutExpired:
            return "", f"Execution timed out after {timeout} seconds", 124
        except FileNotFoundError:
            return "", "Docker executable not found", 127
        except Exception as e:
            return "", str(e), 1

    def execute(self, code: str, stdin: str = "") -> ExecutionResult:
        start_time = time.time()
        with tempfile.TemporaryDirectory() as temp_dir:
            source_path = os.path.join(temp_dir, self.source_filename)
            with open(source_path, "w", encoding="utf-8") as f:
                f.write(code)

            c_stdout, c_stderr, c_code = "", "", 0
            if self.compile_cmd:
                c_stdout, c_stderr, c_code = self._execute_docker_cmd(self.compile_cmd, temp_dir, "", self.compile_timeout)
                if c_code != 0:
                    return ExecutionResult(
                        stdout="",
                        stderr="",
                        compile_output=c_stderr or c_stdout,
                        exit_code=c_code,
                        time_ms=int((time.time() - start_time) * 1000),
                        memory_mb=0.0,
                        compiler_version=self.image
                    )

            r_stdout, r_stderr, r_code = self._execute_docker_cmd(self.run_cmd, temp_dir, stdin, self.run_timeout)
            
            return ExecutionResult(
                stdout=r_stdout,
                stderr=r_stderr,
                compile_output=c_stdout + "\\n" + c_stderr if self.compile_cmd else "",
                exit_code=r_code,
                time_ms=int((time.time() - start_time) * 1000),
                memory_mb=0.0, # Not easily extracting memory without custom wrapper inside docker
                compiler_version=self.image
            )


# ==========================================
# Factory
# ==========================================

def get_runner(language: str) -> BaseRunner:
    if not DOCKER_AVAILABLE:
        # Fallback to local
        mapping = {
            "python": PythonLocalRunner(),
            "javascript": NodeLocalRunner(),
            "c": GccLocalRunner(),
            "cpp": GppLocalRunner(),
            "java": JavaLocalRunner(),
            "html": HTMLFallbackRunner(),
        }
        if language in mapping:
            return mapping[language]
        return UnsupportedLocalRunner(language)
        
    # Docker Runners
    if language == "python":
        return DockerRunner("python:3.10-alpine", run_cmd=["python", "main.py"], source_filename="main.py")
    elif language == "javascript":
        return DockerRunner("node:18-alpine", run_cmd=["node", "main.js"], source_filename="main.js")
    elif language == "c":
        return DockerRunner("gcc:11", compile_cmd=["gcc", "main.c", "-o", "main"], run_cmd=["./main"], source_filename="main.c")
    elif language == "cpp":
        return DockerRunner("gcc:11", compile_cmd=["g++", "main.cpp", "-o", "main"], run_cmd=["./main"], source_filename="main.cpp")
    elif language == "java":
        return DockerRunner("amazoncorretto:17-alpine", compile_cmd=["javac", "Main.java"], run_cmd=["java", "Main"], source_filename="Main.java")
    elif language == "csharp":
        # Using a script runner for C# (requires creating a project, so we use dotnet run with a wrapper or script execution if possible, but csi is easier for single files)
        # We can write a runner script or just use mono for single files.
        return DockerRunner("mono:6.12", compile_cmd=["mcs", "main.cs"], run_cmd=["mono", "main.exe"], source_filename="main.cs")
    elif language == "go":
        return DockerRunner("golang:1.20-alpine", run_cmd=["go", "run", "main.go"], source_filename="main.go")
    elif language == "rust":
        return DockerRunner("rust:1.70-alpine", compile_cmd=["rustc", "main.rs"], run_cmd=["./main"], source_filename="main.rs")
    elif language == "php":
        return DockerRunner("php:8.2-cli-alpine", run_cmd=["php", "main.php"], source_filename="main.php")
    elif language == "kotlin":
        # Kotlin requires compiling to jar then running
        return DockerRunner("zenika/kotlin:1.8", compile_cmd=["kotlinc", "main.kt", "-include-runtime", "-d", "main.jar"], run_cmd=["java", "-jar", "main.jar"], source_filename="main.kt")
    elif language == "html":
        return HTMLFallbackRunner()
    
    raise ValueError(f"Unsupported language: {language}")
