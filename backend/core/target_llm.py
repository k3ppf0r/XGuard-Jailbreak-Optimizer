"""
目标LLM API接口封装
支持OpenAI和阿里云DashScope(通义千问)等兼容OpenAI格式的API
"""
from openai import AsyncOpenAI
from typing import Optional
import os


class TargetLLMAPI:
    """目标大语言模型API封装类"""
    
    # 预定义的模型服务配置
    MODEL_CONFIGS = {
        # OpenAI模型
        'gpt-3.5-turbo': {'base_url': None, 'provider': 'openai'},
        'gpt-4': {'base_url': None, 'provider': 'openai'},
        'gpt-4-turbo': {'base_url': None, 'provider': 'openai'},
        # 阿里云通义千问模型
        'qwen-plus': {'base_url': 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'provider': 'dashscope'},
        'qwen-turbo': {'base_url': 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'provider': 'dashscope'},
        'qwen-max': {'base_url': 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'provider': 'dashscope'},
        'qwen-long': {'base_url': 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'provider': 'dashscope'},
    }
    
    def __init__(
        self,
        api_key: str,
        model_name: str = "gpt-3.5-turbo",
        base_url: Optional[str] = None,
        max_tokens: int = 500,
        temperature: float = 0.7
    ):
        """
        初始化目标LLM客户端
        
        Args:
            api_key: API密钥(OpenAI的sk-xxx或DashScope的sk-xxx)
            model_name: 模型名称
            base_url: API基础URL(可选,如果不指定则根据model_name自动选择)
            max_tokens: 最大生成token数
            temperature: 温度参数
        """
        self.api_key = api_key
        self.model_name = model_name
        self.max_tokens = max_tokens
        self.temperature = temperature
        
        # 自动配置base_url
        if base_url is None and model_name in self.MODEL_CONFIGS:
            base_url = self.MODEL_CONFIGS[model_name]['base_url']
        
        # 初始化异步客户端
        if base_url:
            self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        else:
            self.client = AsyncOpenAI(api_key=api_key)
    
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        调用目标LLM生成响应
        
        Args:
            prompt: 用户提示词
            system_prompt: 系统提示词(可选)
            
        Returns:
            LLM生成的响应文本
        """
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            # 返回错误信息而不是抛出异常,方便优化器继续运行
            return f"[LLM API Error: {str(e)}]"
    
    async def generate_with_context(
        self,
        messages: list,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        支持多轮对话的生成方法
        
        Args:
            messages: 对话历史列表
            system_prompt: 系统提示词
            
        Returns:
            LLM响应
        """
        try:
            full_messages = []
            if system_prompt:
                full_messages.append({"role": "system", "content": system_prompt})
            full_messages.extend(messages)
            
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=full_messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            return f"[LLM API Error: {str(e)}]"


def create_target_llm(
    api_key: str,
    model_name: str = "gpt-3.5-turbo",
    base_url: Optional[str] = None
) -> TargetLLMAPI:
    """
    工厂函数:创建目标LLM实例
    
    Args:
        api_key: API密钥
        model_name: 模型名称(支持gpt-3.5-turbo, gpt-4, qwen-plus等)
        base_url: API基础URL(可选,会自动根据model_name配置)
        
    Returns:
        LLM API实例
    """
    return TargetLLMAPI(
        api_key=api_key,
        model_name=model_name,
        base_url=base_url
    )
