import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";
import { loginUser, registerUser } from "./services/authService";

export function setupAuthScreen(onLoginSuccess: () => void): void {
  const authScreen = document.getElementById("auth-screen") as HTMLDivElement;

  const loginForm = document.getElementById("login-form") as HTMLDivElement;
  const registerForm = document.getElementById("register-form") as HTMLDivElement;

  const loginEmailInput = document.getElementById("login-email-input") as HTMLInputElement;
  const loginPasswordInput = document.getElementById("login-password-input") as HTMLInputElement;

  const registerUsernameInput = document.getElementById("register-username-input") as HTMLInputElement;
  const registerEmailInput = document.getElementById("register-email-input") as HTMLInputElement;
  const registerPasswordInput = document.getElementById("register-password-input") as HTMLInputElement;

  const loginButton = document.getElementById("login-button") as HTMLButtonElement;
  const goToRegisterButton = document.getElementById("go-to-register-button") as HTMLButtonElement;
  const registerButton = document.getElementById("register-button") as HTMLButtonElement;
  const backToLoginButton = document.getElementById("back-to-login-button") as HTMLButtonElement;

  const loginMessage = document.getElementById("login-message") as HTMLParagraphElement;
  const registerMessage = document.getElementById("register-message") as HTMLParagraphElement;

  let gameStarted = false;

  function showLoginScreen(): void {
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    loginMessage.textContent = "";
    registerMessage.textContent = "";
  }

  function showRegisterScreen(): void {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    loginMessage.textContent = "";
    registerMessage.textContent = "";
  }

  function setLoginMessage(text: string, type: "error" | "success" = "error"): void {
    loginMessage.textContent = text;
    loginMessage.className = type === "error" ? "auth-message auth-error" : "auth-message auth-success";
  }

  function setRegisterMessage(text: string, type: "error" | "success" = "error"): void {
    registerMessage.textContent = text;
    registerMessage.className = type === "error" ? "auth-message auth-error" : "auth-message auth-success";
  }

  function setButtonsDisabled(disabled: boolean): void {
    loginButton.disabled = disabled;
    goToRegisterButton.disabled = disabled;
    registerButton.disabled = disabled;
    backToLoginButton.disabled = disabled;
  }

  goToRegisterButton.addEventListener("click", () => {
    showRegisterScreen();
  });

  backToLoginButton.addEventListener("click", () => {
    showLoginScreen();
  });

  loginButton.addEventListener("click", async () => {
    try {
      const email = loginEmailInput.value.trim();
      const password = loginPasswordInput.value.trim();

      if (!email || !password) {
        setLoginMessage("Informe e-mail e senha.");
        return;
      }

      setButtonsDisabled(true);

      await loginUser(email, password);

      setLoginMessage("Login realizado!", "success");
    } catch (error) {
      console.error(error);
      setLoginMessage("E-mail ou senha incorretos.");
    } finally {
      setButtonsDisabled(false);
    }
  });

  registerButton.addEventListener("click", async () => {
    try {
      const username = registerUsernameInput.value.trim();
      const email = registerEmailInput.value.trim();
      const password = registerPasswordInput.value.trim();

      if (!username || !email || !password) {
        setRegisterMessage("Preencha nome, e-mail e senha.");
        return;
      }

      if (password.length < 6) {
        setRegisterMessage("A senha precisa ter pelo menos 6 caracteres.");
        return;
      }

      setButtonsDisabled(true);

      await registerUser(username, email, password);

      setRegisterMessage("Conta criada com sucesso!", "success");
    } catch (error) {
      console.error(error);
      setRegisterMessage("Erro ao criar conta. Verifique os dados.");
    } finally {
      setButtonsDisabled(false);
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      authScreen.style.display = "none";

      if (!gameStarted) {
        gameStarted = true;
        onLoginSuccess();
      }
    } else {
      authScreen.style.display = "flex";
      showLoginScreen();
    }
  });

  showLoginScreen();
}