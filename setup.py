from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="agentx",
    version="0.2.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="AGENTX - Multi-Model AI Orchestration Tool",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/agentx",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "aiohttp>=3.8.0",
        "python-dotenv>=0.19.0",
        "rich>=12.0.0",
        "certifi>=2021.10.8",
    ],
    entry_points={
        "console_scripts": [
            "agentx=cli.main:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
)
