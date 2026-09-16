"""Mulberry32 seeded shuffle — must match frontend src/utils/shuffle.ts exactly."""


def _to_u32(n: int) -> int:
    return n & 0xFFFFFFFF


def _to_i32(n: int) -> int:
    n = _to_u32(n)
    return n - 0x100000000 if n >= 0x80000000 else n


def _imul(a: int, b: int) -> int:
    return _to_i32(_to_u32(a) * _to_u32(b))


def _mulberry32(seed: int):
    seed = _to_i32(seed)

    def rand() -> float:
        nonlocal seed
        seed = _to_i32(seed + 0x6D2B79F5)
        t = _imul(seed ^ (_to_u32(seed) >> 15), 1 | _to_u32(seed))
        t = _to_i32(t + _imul(t ^ (_to_u32(t) >> 7), 61 | _to_u32(t))) ^ t
        return _to_u32(t ^ (_to_u32(t) >> 14)) / 4294967296

    return rand


def seeded_shuffle(arr: list, seed: int) -> list:
    result = list(arr)
    rand = _mulberry32(seed)
    for i in range(len(result) - 1, 0, -1):
        j = int(rand() * (i + 1))
        result[i], result[j] = result[j], result[i]
    return result
