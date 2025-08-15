from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="agentx",
    version="0.3.0",
    author="AGENT-X Team",
    description="AGENT-X - Multi-Model AI Orchestration Tool",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/agentx",
    packages=find_packages(include=['agentx', 'agentx.*']),
    include_package_data=True,
    install_requires=[
        "aiohttp>=3.8.0",
        "python-dotenv>=1.0.0",
        "rich>=13.0.0",
        "certifi>=2021.10.8",
        "typing-extensions>=4.0.0",
    ],
    entry_points={
        "console_scripts": [
            "agentx=agentx.cli.main:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.9",
)
