import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./contract";
import "./index.css";

type EscrowData = {
  id: number;
  buyer: string;
  seller: string;
  amount: string;
  status: number;
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

const SEPOLIA_CHAIN_ID = "0xaa36a7";

function App() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [networkCorrect, setNetworkCorrect] = useState(true);

  function shortAddress(address: string) {
    if (!address) return "-";

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function statusText(status: number) {
    switch (status) {
      case 0:
        return "Created";
      case 1:
        return "Funded";
      case 2:
        return "Completed";
      case 3:
        return "Cancelled";
      default:
        return "Unknown";
    }
  }

  function getErrorMessage(error: any, fallback: string) {
    if (error?.code === 4001) {
      return "Transaksi dibatalkan oleh user.";
    }

    return (
      error?.reason ||
      error?.shortMessage ||
      error?.info?.error?.message ||
      fallback
    );
  }

  async function getProvider() {
    if (!window.ethereum) {
      throw new Error("MetaMask belum terinstall.");
    }

    return new ethers.BrowserProvider(window.ethereum);
  }

  async function checkNetwork() {
    try {
      const provider = await getProvider();
      const network = await provider.getNetwork();

      const isSepolia =
        network.chainId === BigInt(11155111);

      setNetworkCorrect(isSepolia);

      return isSepolia;
    } catch (error) {
      console.error(error);
      setNetworkCorrect(false);
      return false;
    }
  }

  async function switchToSepolia() {
    try {
      if (!window.ethereum) {
        alert("MetaMask belum terinstall.");
        return;
      }

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID,
          },
        ],
      });

      setNetworkCorrect(true);
      setMessage("Berhasil pindah ke Sepolia.");

      if (account) {
        await loadWallet(account);
        await loadEscrows();
      }
    } catch (error: any) {
      console.error(error);

      if (error?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: "Sepolia",
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: [
                  "https://rpc.sepolia.org",
                ],
                blockExplorerUrls: [
                  "https://sepolia.etherscan.io",
                ],
              },
            ],
          });

          setNetworkCorrect(true);
        } catch (addError: any) {
          setMessage(
            getErrorMessage(
              addError,
              "Gagal menambahkan Sepolia."
            )
          );
        }
      } else {
        setMessage(
          getErrorMessage(
            error,
            "Gagal pindah ke Sepolia."
          )
        );
      }
    }
  }

  async function loadWallet(address: string) {
    try {
      const provider = await getProvider();

      const walletBalance =
        await provider.getBalance(address);

      setAccount(address);
      setBalance(
        ethers.formatEther(walletBalance)
      );

      await checkNetwork();
    } catch (error) {
      console.error(error);
    }
  }

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("MetaMask belum terinstall.");
        return;
      }

      const provider = await getProvider();

      const accounts =
        await provider.send(
          "eth_requestAccounts",
          []
        );

      if (accounts.length > 0) {
        await loadWallet(accounts[0]);
        setMessage("");
      }
    } catch (error: any) {
      console.error(error);

      setMessage(
        getErrorMessage(
          error,
          "Gagal menghubungkan wallet."
        )
      );
    }
  }

  async function loadEscrows() {
    try {
      if (!window.ethereum || !account) return;

      const isSepolia = await checkNetwork();

      if (!isSepolia) return;

      const provider = await getProvider();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const count =
        await contract.escrowCount();

      const data: EscrowData[] = [];

      for (
        let i = 1;
        i <= Number(count);
        i++
      ) {
        const escrow =
          await contract.escrows(i);

        data.push({
          id: i,
          buyer: escrow[0],
          seller: escrow[1],
          amount: ethers.formatEther(
            escrow[2]
          ),
          status: Number(escrow[3]),
        });
      }

      setEscrows(data.reverse());
    } catch (error) {
      console.error(
        "Gagal mengambil escrow:",
        error
      );
    }
  }

  async function refreshWallet() {
    if (!account) return;

    try {
      const provider = await getProvider();

      const newBalance =
        await provider.getBalance(account);

      setBalance(
        ethers.formatEther(newBalance)
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function createEscrow() {
    try {
      if (!window.ethereum) {
        alert("MetaMask belum terinstall.");
        return;
      }

      const isSepolia = await checkNetwork();

      if (!isSepolia) {
        await switchToSepolia();
        return;
      }

      if (!seller.trim()) {
        alert("Masukkan address seller.");
        return;
      }

      if (!ethers.isAddress(seller.trim())) {
        alert("Address seller tidak valid.");
        return;
      }

      if (seller.toLowerCase() === account.toLowerCase()) {
        alert(
          "Seller address tidak boleh sama dengan wallet buyer."
        );
        return;
      }

      if (!amount.trim()) {
        alert("Masukkan jumlah ETH.");
        return;
      }

      let parsedAmount: bigint;

      try {
        parsedAmount =
          ethers.parseEther(amount);
      } catch {
        alert("Jumlah ETH tidak valid.");
        return;
      }

      if (parsedAmount <= 0n) {
        alert("Jumlah ETH harus lebih dari 0.");
        return;
      }

      setLoading(true);
      setMessage(
        "Menunggu konfirmasi MetaMask..."
      );

      const provider = await getProvider();
      const signer =
        await provider.getSigner();

      const contract =
        new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );

      const tx =
        await contract.createEscrow(
          seller.trim(),
          {
            value: parsedAmount,
          }
        );

      setMessage(
        "Transaksi sedang diproses..."
      );

      await tx.wait();

      setMessage(
        `Escrow berhasil dibuat! TX: ${tx.hash}`
      );

      setSeller("");
      setAmount("");

      await refreshWallet();
      await loadEscrows();

      setActiveTab("dashboard");
    } catch (error: any) {
      console.error(error);

      setMessage(
        getErrorMessage(
          error,
          "Transaksi gagal."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function completeEscrow(id: number) {
    try {
      if (!window.ethereum) return;

      const isSepolia = await checkNetwork();

      if (!isSepolia) {
        await switchToSepolia();
        return;
      }

      setLoading(true);
      setMessage(
        "Menunggu konfirmasi MetaMask..."
      );

      const provider = await getProvider();
      const signer =
        await provider.getSigner();

      const contract =
        new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );

      const tx =
        await contract.completeEscrow(id);

      setMessage(
        "Transaksi sedang diproses..."
      );

      await tx.wait();

      setMessage(
        `Escrow #${id} berhasil diselesaikan!`
      );

      await loadEscrows();
      await refreshWallet();
    } catch (error: any) {
      console.error(error);

      setMessage(
        getErrorMessage(
          error,
          "Gagal menyelesaikan escrow."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function cancelEscrow(id: number) {
    try {
      if (!window.ethereum) return;

      const isSepolia = await checkNetwork();

      if (!isSepolia) {
        await switchToSepolia();
        return;
      }

      setLoading(true);
      setMessage(
        "Menunggu konfirmasi MetaMask..."
      );

      const provider = await getProvider();
      const signer =
        await provider.getSigner();

      const contract =
        new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );

      const tx =
        await contract.cancelEscrow(id);

      setMessage(
        "Transaksi sedang diproses..."
      );

      await tx.wait();

      setMessage(
        `Escrow #${id} berhasil dibatalkan!`
      );

      await loadEscrows();
      await refreshWallet();
    } catch (error: any) {
      console.error(error);

      setMessage(
        getErrorMessage(
          error,
          "Gagal membatalkan escrow."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged =
      async (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount("");
          setBalance("");
          setEscrows([]);
          setMessage("");
          return;
        }

        await loadWallet(accounts[0]);
      };

    const handleChainChanged = async () => {
      setEscrows([]);

      await checkNetwork();

      if (account) {
        await loadWallet(account);
        await loadEscrows();
      }
    };

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    window.ethereum.on(
      "chainChanged",
      handleChainChanged
    );

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, [account]);

  useEffect(() => {
    if (account) {
      loadEscrows();
    }
  }, [account]);

  const myEscrows = escrows.filter(
    (escrow) =>
      escrow.buyer.toLowerCase() ===
        account.toLowerCase() ||
      escrow.seller.toLowerCase() ===
        account.toLowerCase()
  );

  const activeEscrows = myEscrows.filter(
    (escrow) => escrow.status === 1
  );

  const buyerEscrows = myEscrows.filter(
    (escrow) =>
      escrow.buyer.toLowerCase() ===
      account.toLowerCase()
  );

  const sellerEscrows = myEscrows.filter(
    (escrow) =>
      escrow.seller.toLowerCase() ===
      account.toLowerCase()
  );

  function isBuyer(escrow: EscrowData) {
    return (
      escrow.buyer.toLowerCase() ===
      account.toLowerCase()
    );
  }

  function isSeller(escrow: EscrowData) {
    return (
      escrow.seller.toLowerCase() ===
      account.toLowerCase()
    );
  }

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">
          <div className="logo-icon">
            O
          </div>

          <div>
            <h2>O-Escrow</h2>
            <span>Web3 Escrow</span>
          </div>
        </div>

        <nav>

          <button
            className={
              activeTab === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveTab("dashboard")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={
              activeTab === "create"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveTab("create")
            }
          >
            <span>＋</span>
            Create Escrow
          </button>

          <button
            className={
              activeTab === "escrows"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActiveTab("escrows")
            }
          >
            <span>▣</span>
            My Escrows
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="network">

            <span className="status-dot"></span>

            {networkCorrect
              ? "Sepolia Network"
              : "Wrong Network"}

          </div>

          <div className="contract-info">

            <span>
              Smart Contract
            </span>

            <strong>
              {shortAddress(
                CONTRACT_ADDRESS
              )}
            </strong>

          </div>

        </div>

      </aside>

      {/* MAIN */}

      <main className="main">

        {/* HEADER */}

        <header className="header">

          <div>

            <h1>
              {activeTab === "dashboard" &&
                "Dashboard"}

              {activeTab === "create" &&
                "Create Escrow"}

              {activeTab === "escrows" &&
                "My Escrows"}
            </h1>

            <p>
              Secure transactions powered by
              Ethereum smart contract.
            </p>

          </div>

          {!account ? (

            <button
              className="connect-btn"
              onClick={connectWallet}
            >
              <span>◉</span>
              Connect Wallet
            </button>

          ) : (

            <div className="wallet">

              <div className="wallet-avatar">
                {account
                  .slice(2, 4)
                  .toUpperCase()}
              </div>

              <div>

                <strong>
                  {shortAddress(account)}
                </strong>

                <span>
                  {Number(balance).toFixed(4)}
                  {" "}ETH
                </span>

              </div>

            </div>

          )}

        </header>

        {/* WRONG NETWORK */}

        {account && !networkCorrect && (

          <div className="network-warning">

            <div>
              <strong>
                Wrong Network
              </strong>

              <span>
                O-Escrow berjalan di
                Ethereum Sepolia.
              </span>
            </div>

            <button
              onClick={switchToSepolia}
            >
              Switch to Sepolia
            </button>

          </div>

        )}

        {!account ? (

          <section className="welcome">

            <div className="welcome-glow"></div>

            <div className="welcome-icon">
              🔐
            </div>

            <h2>
              Secure Your Transactions
            </h2>

            <p>
              O-Escrow memungkinkan buyer
              dan seller bertransaksi
              menggunakan smart contract
              tanpa perlu saling percaya.
            </p>

            <button
              className="primary-btn"
              onClick={connectWallet}
            >
              Connect MetaMask
            </button>

            <div className="features">

              <div>
                <span>🔒</span>
                <strong>Secure</strong>
                <small>
                  Smart Contract
                </small>
              </div>

              <div>
                <span>⚡</span>
                <strong>Fast</strong>
                <small>
                  Ethereum Sepolia
                </small>
              </div>

              <div>
                <span>◈</span>
                <strong>Transparent</strong>
                <small>
                  On-chain Data
                </small>
              </div>

            </div>

          </section>

        ) : (

          <>

            {/* DASHBOARD */}

            {activeTab === "dashboard" && (

              <>

                <section className="hero">

                  <div className="hero-content">

                    <span className="eyebrow">
                      WEB3 ESCROW
                    </span>

                    <h2>
                      Trade with
                      <br />
                      <span>
                        confidence.
                      </span>
                    </h2>

                    <p>
                      Your ETH is secured by
                      an Ethereum smart contract
                      until the buyer completes
                      or cancels the transaction.
                    </p>

                    <button
                      className="primary-btn"
                      onClick={() =>
                        setActiveTab("create")
                      }
                    >
                      Create New Escrow
                      <span>→</span>
                    </button>

                  </div>

                  <div className="hero-shape">

                    <div className="cube">
                      <div>O</div>
                    </div>

                  </div>

                </section>

                <section className="stats">

                  <div className="stat-card">

                    <div className="stat-icon">
                      ◈
                    </div>

                    <div>
                      <span>
                        Wallet Balance
                      </span>

                      <strong>
                        {Number(
                          balance
                        ).toFixed(4)}

                        <small>
                          {" "}ETH
                        </small>
                      </strong>
                    </div>

                  </div>

                  <div className="stat-card">

                    <div className="stat-icon">
                      ▣
                    </div>

                    <div>
                      <span>
                        My Escrows
                      </span>

                      <strong>
                        {myEscrows.length}
                      </strong>
                    </div>

                  </div>

                  <div className="stat-card">

                    <div className="stat-icon">
                      ◉
                    </div>

                    <div>
                      <span>
                        Active Escrows
                      </span>

                      <strong>
                        {activeEscrows.length}
                      </strong>
                    </div>

                  </div>

                </section>

                <section className="role-stats">

                  <div>
                    <span>
                      Buyer
                    </span>

                    <strong>
                      {buyerEscrows.length}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Seller
                    </span>

                    <strong>
                      {sellerEscrows.length}
                    </strong>
                  </div>

                </section>

                <section className="section">

                  <div className="section-header">

                    <div>
                      <h2>
                        Recent Escrows
                      </h2>

                      <p>
                        Your latest blockchain
                        escrow transactions.
                      </p>
                    </div>

                    <button
                      className="text-btn"
                      onClick={() =>
                        setActiveTab(
                          "escrows"
                        )
                      }
                    >
                      View all →
                    </button>

                  </div>

                  {myEscrows.length === 0 ? (

                    <div className="empty">

                      <div>▣</div>

                      <h3>
                        No escrow yet
                      </h3>

                      <p>
                        Create your first
                        escrow transaction.
                      </p>

                    </div>

                  ) : (

                    <div className="escrow-list">

                      {myEscrows
                        .slice(0, 5)
                        .map((escrow) => (

                          <div
                            className="escrow-row"
                            key={escrow.id}
                          >

                            <div className="escrow-id">

                              <div className="id-icon">
                                #
                              </div>

                              <div>

                                <strong>
                                  Escrow #
                                  {escrow.id}
                                </strong>

                                <span>
                                  {isBuyer(
                                    escrow
                                  )
                                    ? `Seller ${shortAddress(
                                        escrow.seller
                                      )}`
                                    : `Buyer ${shortAddress(
                                        escrow.buyer
                                      )}`}
                                </span>

                              </div>

                            </div>

                            <div className="escrow-amount">

                              <strong>
                                {escrow.amount}
                                {" "}ETH
                              </strong>

                              <span>
                                Sepolia
                              </span>

                            </div>

                            <div className="row-right">

                              <span
                                className={`role-badge ${
                                  isBuyer(
                                    escrow
                                  )
                                    ? "role-buyer"
                                    : "role-seller"
                                }`}
                              >
                                {isBuyer(
                                  escrow
                                )
                                  ? "BUYER"
                                  : "SELLER"}
                              </span>

                              <span
                                className={`badge status-${escrow.status}`}
                              >
                                {statusText(
                                  escrow.status
                                )}
                              </span>

                            </div>

                          </div>

                        ))}

                    </div>

                  )}

                </section>

              </>

            )}

            {/* CREATE */}

            {activeTab === "create" && (

              <section className="create-page">

                <div className="create-card">

                  <div className="form-header">

                    <div className="form-icon">
                      🔐
                    </div>

                    <div>

                      <h2>
                        Create New Escrow
                      </h2>

                      <p>
                        Lock your ETH securely
                        inside the smart contract.
                      </p>

                    </div>

                  </div>

                  <div className="form">

                    <label>
                      Seller Address
                    </label>

                    <input
                      type="text"
                      placeholder="0x..."
                      value={seller}
                      onChange={(e) =>
                        setSeller(
                          e.target.value
                        )
                      }
                    />

                    <small className="hint">
                      Enter the Ethereum wallet
                      address of the seller.
                    </small>

                    <label>
                      Amount
                    </label>

                    <div className="amount-input">

                      <input
                        type="number"
                        placeholder="0.001"
                        value={amount}
                        onChange={(e) =>
                          setAmount(
                            e.target.value
                          )
                        }
                        step="0.001"
                        min="0"
                      />

                      <span>
                        ETH
                      </span>

                    </div>

                    <div className="transaction-preview">

                      <div>
                        <span>
                          Network
                        </span>

                        <strong>
                          Sepolia
                        </strong>
                      </div>

                      <div>
                        <span>
                          Amount
                        </span>

                        <strong>
                          {amount || "0"}
                          {" "}ETH
                        </strong>
                      </div>

                    </div>

                    <button
                      className="primary-btn full"
                      onClick={
                        createEscrow
                      }
                      disabled={loading}
                    >
                      {loading
                        ? "Processing..."
                        : "🔐 Create Escrow"}
                    </button>

                    {message && (

                      <div className="message">
                        {message}
                      </div>

                    )}

                  </div>

                </div>

                <div className="security-card">

                  <div className="security-icon">
                    ✓
                  </div>

                  <h3>
                    Your funds are protected
                  </h3>

                  <p>
                    ETH disimpan oleh smart
                    contract sampai buyer
                    menyelesaikan atau
                    membatalkan escrow.
                  </p>

                  <div className="security-item">
                    <span>✓</span>
                    Smart contract secured
                  </div>

                  <div className="security-item">
                    <span>✓</span>
                    Blockchain verified
                  </div>

                  <div className="security-item">
                    <span>✓</span>
                    Transparent transactions
                  </div>

                </div>

              </section>

            )}

            {/* ESCROWS */}

            {activeTab === "escrows" && (

              <section className="section">

                <div className="section-header">

                  <div>

                    <h2>
                      My Escrows
                    </h2>

                    <p>
                      Escrows where your wallet
                      is buyer or seller.
                    </p>

                  </div>

                  <button
                    className="primary-btn small"
                    onClick={() =>
                      setActiveTab(
                        "create"
                      )
                    }
                  >
                    + New Escrow
                  </button>

                </div>

                {myEscrows.length === 0 ? (

                  <div className="empty">

                    <div>▣</div>

                    <h3>
                      No escrow found
                    </h3>

                    <p>
                      Create your first
                      escrow transaction.
                    </p>

                  </div>

                ) : (

                  <div className="escrow-cards">

                    {myEscrows.map(
                      (escrow) => (

                        <div
                          className="escrow-card"
                          key={escrow.id}
                        >

                          <div className="card-top">

                            <div>

                              <span>
                                ESCROW
                              </span>

                              <h3>
                                #{escrow.id}
                              </h3>

                            </div>

                            <span
                              className={`badge status-${escrow.status}`}
                            >
                              {statusText(
                                escrow.status
                              )}
                            </span>

                          </div>

                          <div className="big-amount">

                            {escrow.amount}

                            <span>
                              {" "}ETH
                            </span>

                          </div>

                          <div className="address-box">

                            <div>

                              <span>
                                BUYER
                              </span>

                              <strong>
                                {shortAddress(
                                  escrow.buyer
                                )}
                              </strong>

                            </div>

                            <div className="arrow">
                              →
                            </div>

                            <div>

                              <span>
                                SELLER
                              </span>

                              <strong>
                                {shortAddress(
                                  escrow.seller
                                )}
                              </strong>

                            </div>

                          </div>

                          <div className="card-role">

                            {isBuyer(
                              escrow
                            ) ? (

                              <>
                                <span>
                                  Your role
                                </span>

                                <strong className="role-buyer">
                                  BUYER
                                </strong>
                              </>

                            ) : (

                              <>
                                <span>
                                  Your role
                                </span>

                                <strong className="role-seller">
                                  SELLER
                                </strong>
                              </>

                            )}

                          </div>

                          {escrow.status ===
                            1 &&
                            isBuyer(
                              escrow
                            ) && (

                              <div className="actions">

                                <button
                                  className="complete-btn"
                                  onClick={() =>
                                    completeEscrow(
                                      escrow.id
                                    )
                                  }
                                  disabled={
                                    loading
                                  }
                                >
                                  ✓ Complete
                                </button>

                                <button
                                  className="cancel-btn"
                                  onClick={() =>
                                    cancelEscrow(
                                      escrow.id
                                    )
                                  }
                                  disabled={
                                    loading
                                  }
                                >
                                  Cancel
                                </button>

                              </div>

                            )}

                          {escrow.status ===
                            1 &&
                            isSeller(
                              escrow
                            ) && (

                              <div className="seller-notice">
                                <span>
                                  ●
                                </span>

                                Waiting for buyer
                                to complete the
                                transaction.
                              </div>

                            )}

                        </div>

                      )
                    )}

                  </div>

                )}

              </section>

            )}

          </>

        )}

      </main>

    </div>
  );
}

export default App;
