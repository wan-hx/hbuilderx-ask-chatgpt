#!/usr/bin/env python

import os
import sys
import json

# 读取prompt.json文件
with open('prompt.json', 'r') as f:
    prompts = json.load(f)["cn"]

result = []
for item in prompts:
    result.append({"label": item[0], "description": item[1]})

# 将result写入prompts.json文件
with open('prompts.json', 'w') as f:
    json.dump(result, f, ensure_ascii=False, indent=4)