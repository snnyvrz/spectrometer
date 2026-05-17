from simulator.main import Simulation

if __name__ == "__main__":
    s = Simulation()
    s._load_csv()
    print(s.current_timestamp)