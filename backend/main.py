import asyncio

from simulator.main import Simulation

if __name__ == "__main__":
    s = Simulation()
    s.start()
    asyncio.run(s.run())
