"""PolyfactoryベースのテストデータFactory"""

from polyfactory.factories.pydantic_factory import ModelFactory
from app.schemas.user import UserCreate
from app.schemas.todo import TodoCreate, PriorityEnum


class UserCreateFactory(ModelFactory):
    """ユーザー作成用Factory

    Usage:
        user_data = UserCreateFactory.build()
        user_data = UserCreateFactory.build(email="specific@example.com")
    """

    __model__ = UserCreate

    @classmethod
    def email(cls) -> str:
        return cls.__faker__.email()

    @classmethod
    def password(cls) -> str:
        return "password123"


class TodoCreateFactory(ModelFactory):
    """Todo作成用Factory"""

    __model__ = TodoCreate

    @classmethod
    def title(cls) -> str:
        return cls.__faker__.sentence(nb_words=4)

    @classmethod
    def is_completed(cls) -> bool:
        return False

    @classmethod
    def priority(cls) -> PriorityEnum:
        return PriorityEnum.LOW

    @classmethod
    def due_date(cls):
        return None

    @classmethod
    def tags(cls):
        return None
