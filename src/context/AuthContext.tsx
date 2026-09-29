import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'commercial' | 'employee' | 'user';

export interface UserAccount {
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roleLabel: string;
  createdAt?: string;
}

export interface AuthUser {
  username: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
}

export interface PasswordResetPending {
  username: string;
  email: string;
  name: string;
  code: string;
  expiresAt: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCommercial: boolean;
  isEmployee: boolean;
  usersList: UserAccount[];
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resetPassword: (username: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  resetPasswordWithEmail: (usernameOrEmail: string, emailVerification: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  requestPasswordResetCode: (usernameOrEmail: string, emailVerification: string) => Promise<{
    success: boolean;
    message: string;
    code?: string;
    email?: string;
    name?: string;
    expiresInSeconds?: number;
  }>;
  verifyResetCode: (usernameOrEmail: string, codeInput: string) => Promise<{
    success: boolean;
    message: string;
  }>;
  completePasswordResetWithCode: (
    usernameOrEmail: string,
    codeInput: string,
    newPasswordInput: string
  ) => Promise<{
    success: boolean;
    message: string;
  }>;
  quickAdminResetPassword: (username: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  createUser: (userData: { username: string; name: string; email: string; password: string; role: UserRole }) => Promise<{ success: boolean; message: string }>;
  deleteUser: (username: string) => Promise<{ success: boolean; message: string }>;
}

const SESSION_KEY = 'kanflow_auth_session';
const USERS_STORAGE_KEY = 'kanflow_registered_users';
const RESET_STORAGE_KEY = 'kanflow_pwd_reset_pending';
const DELETED_USERS_KEY = 'kanflow_deleted_usernames';

function getDeletedUsernames(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((s: string) => s.toLowerCase());
    }
  } catch (e) {}
  return [];
}

function addDeletedUsername(username: string): void {
  try {
    const list = getDeletedUsernames();
    const lower = username.trim().toLowerCase();
    if (!list.includes(lower)) {
      list.push(lower);
      localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(list));
    }
  } catch (e) {}
}

function removeDeletedUsername(username: string): void {
  try {
    const list = getDeletedUsernames();
    const lower = username.trim().toLowerCase();
    const filtered = list.filter(u => u !== lower);
    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(filtered));
  } catch (e) {}
}

// Contas padrão com e-mails cadastrados para conferência segura
const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    username: 'admin',
    name: 'Gerenciador (Admin)',
    email: 'admin@kanflow.com.br',
    password: 'admin17',
    role: 'admin',
    roleLabel: 'Administrador / Gerenciador'
  },
  {
    username: 'comercial',
    name: 'Acesso Comercial',
    email: 'comercial@kanflow.com.br',
    password: 'comercial123',
    role: 'commercial',
    roleLabel: 'Usuário Comercial'
  },
  {
    username: 'thais paiva',
    name: 'Thais Paiva',
    email: 'thaispaaivaa1@gmail.com',
    password: 'tp15',
    role: 'commercial',
    roleLabel: 'Usuário Comercial'
  },
  {
    username: 'funcionario',
    name: 'Funcionário (Operacional)',
    email: 'funcionario@kanflow.com.br',
    password: 'func123',
    role: 'employee',
    roleLabel: 'Funcionário'
  }
];

function getStoredUsers(): UserAccount[] {
  try {
    const deletedList = getDeletedUsernames();
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    let accounts: UserAccount[] = DEFAULT_ACCOUNTS.filter(d => !deletedList.includes(d.username.toLowerCase()));
    
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        accounts = parsed
          .filter((u: any) => !deletedList.includes((u.username || '').toLowerCase()))
          .map((u: any) => {
            let role: UserRole = u.role;
            let roleLabel = u.roleLabel || 'Usuário Comercial';
            const lowerUser = (u.username || '').toLowerCase();

            if (lowerUser === 'admin') {
              role = 'admin';
              roleLabel = 'Administrador / Gerenciador';
            } else if (lowerUser === 'thais paiva' || lowerUser === 'comercial' || role === 'commercial') {
              role = 'commercial';
              roleLabel = 'Usuário Comercial';
            } else if (lowerUser === 'funcionario' || role === 'employee' || role === 'user') {
              role = 'employee';
              roleLabel = 'Funcionário';
            }

            return {
              ...u,
              role,
              roleLabel,
              email: u.email || (lowerUser === 'thais paiva' ? 'thaispaaivaa1@gmail.com' : `${lowerUser.replace(/\s+/g, '')}@empresa.com.br`)
            };
          });

        // Ensure default accounts exist ONLY IF NOT explicitly deleted
        DEFAULT_ACCOUNTS.forEach(defAcc => {
          const lower = defAcc.username.toLowerCase();
          if (!deletedList.includes(lower) && !accounts.some(a => a.username.toLowerCase() === lower)) {
            accounts.push(defAcc);
          }
        });
      }
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(accounts));
    return accounts;
  } catch (e) {
    console.error('Erro ao ler usuários:', e);
  }
  const fallback = DEFAULT_ACCOUNTS.filter(d => !getDeletedUsernames().includes(d.username.toLowerCase()));
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(fallback));
  return fallback;
}

function saveStoredUsers(users: UserAccount[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Erro ao salvar usuários:', e);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usersList, setUsersList] = useState<UserAccount[]>(getStoredUsers);

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao ler sessão:', e);
    }
    return null;
  });

  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedInput = usernameInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    const accounts = getStoredUsers();
    const matchedAccount = accounts.find(
      acc => (acc.username.toLowerCase() === trimmedInput || acc.email.toLowerCase() === trimmedInput) && acc.password === trimmedPass
    );

    if (matchedAccount) {
      const loggedUser: AuthUser = {
        username: matchedAccount.username,
        name: matchedAccount.name,
        email: matchedAccount.email,
        role: matchedAccount.role,
        roleLabel: matchedAccount.roleLabel
      };
      setUser(loggedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(loggedUser));
      return { success: true };
    }

    return { 
      success: false, 
      error: 'Usuário/E-mail ou senha incorretos. Verifique suas credenciais.' 
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  // Redefinir senha com conferência obrigatória do e-mail pessoal cadastrado
  const resetPasswordWithEmail = async (
    usernameOrEmailInput: string, 
    emailVerificationInput: string, 
    newPasswordInput: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetQuery = usernameOrEmailInput.trim().toLowerCase();
    const emailVerify = emailVerificationInput.trim().toLowerCase();
    const newPass = newPasswordInput.trim();

    if (!targetQuery) {
      return { success: false, message: 'Informe seu usuário ou login cadastrado.' };
    }

    if (!emailVerify) {
      return { success: false, message: 'Informe seu e-mail pessoal cadastrado para conferência.' };
    }

    if (!newPass || newPass.length < 4) {
      return { success: false, message: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    const currentUsers = getStoredUsers();
    const userIndex = currentUsers.findIndex(
      u => u.username.toLowerCase() === targetQuery || u.email.toLowerCase() === targetQuery
    );

    if (userIndex === -1) {
      return { success: false, message: `Conta correspondente a "${usernameOrEmailInput}" não foi encontrada no sistema.` };
    }

    const matchedUser = currentUsers[userIndex];

    // Validação estrita do e-mail pessoal cadastrado
    if (matchedUser.email.toLowerCase() !== emailVerify) {
      return { 
        success: false, 
        message: 'O e-mail pessoal informado não confere com o cadastrado nesta conta. Verifique e tente novamente.' 
      };
    }

    // Sucesso: atualiza a senha
    currentUsers[userIndex].password = newPass;
    saveStoredUsers(currentUsers);
    setUsersList([...currentUsers]);

    return { 
      success: true, 
      message: `Identidade conferida com sucesso! Nova senha cadastrada para ${matchedUser.name}.` 
    };
  };

  // Redefinir senha diretamente pelo usuário (sem exigência de e-mail)
  const resetPassword = async (
    usernameInput: string,
    newPasswordInput: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetQuery = usernameInput.trim().toLowerCase();
    const newPass = newPasswordInput.trim();

    if (!targetQuery) {
      return { success: false, message: 'Informe seu usuário ou login cadastrado.' };
    }

    if (!newPass || newPass.length < 4) {
      return { success: false, message: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    const currentUsers = getStoredUsers();
    const userIndex = currentUsers.findIndex(
      u => u.username.toLowerCase() === targetQuery || u.email.toLowerCase() === targetQuery
    );

    if (userIndex === -1) {
      return { 
        success: false, 
        message: `Conta correspondente a "${usernameInput}" não foi encontrada no sistema.` 
      };
    }

    const matchedUser = currentUsers[userIndex];
    currentUsers[userIndex].password = newPass;
    saveStoredUsers(currentUsers);
    setUsersList([...currentUsers]);

    return { 
      success: true, 
      message: `Nova senha cadastrada com sucesso para ${matchedUser.name}!` 
    };
  };

  // 1. Solicitar código de verificação para o e-mail cadastrado
  const requestPasswordResetCode = async (
    usernameOrEmailInput: string,
    emailVerificationInput: string
  ): Promise<{
    success: boolean;
    message: string;
    code?: string;
    email?: string;
    name?: string;
    expiresInSeconds?: number;
  }> => {
    const targetQuery = usernameOrEmailInput.trim().toLowerCase();
    const emailVerify = emailVerificationInput.trim().toLowerCase();

    if (!targetQuery) {
      return { success: false, message: 'Informe seu usuário ou login cadastrado.' };
    }

    if (!emailVerify) {
      return { success: false, message: 'Informe seu e-mail pessoal cadastrado para conferência.' };
    }

    const currentUsers = getStoredUsers();
    const matchedUser = currentUsers.find(
      u => u.username.toLowerCase() === targetQuery || u.email.toLowerCase() === targetQuery
    );

    if (!matchedUser) {
      return { 
        success: false, 
        message: `A conta correspondente a "${usernameOrEmailInput}" não foi encontrada no sistema.` 
      };
    }

    // Conferência estrita do e-mail cadastrado
    if (matchedUser.email.toLowerCase() !== emailVerify) {
      return {
        success: false,
        message: 'O e-mail informado não coincide com o e-mail pessoal cadastrado nesta conta. Verifique os dados.'
      };
    }

    // Gera um código de 6 dígitos numéricos seguro
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // Válido por 10 minutos

    const pendingData: PasswordResetPending = {
      username: matchedUser.username,
      email: matchedUser.email,
      name: matchedUser.name,
      code,
      expiresAt
    };

    localStorage.setItem(RESET_STORAGE_KEY, JSON.stringify(pendingData));

    return {
      success: true,
      message: `Código de confirmação gerado e enviado para ${matchedUser.email}!`,
      code,
      email: matchedUser.email,
      name: matchedUser.name,
      expiresInSeconds: 600
    };
  };

  // 2. Validar o código recebido no e-mail
  const verifyResetCode = async (
    usernameOrEmailInput: string,
    codeInput: string
  ): Promise<{ success: boolean; message: string }> => {
    const raw = localStorage.getItem(RESET_STORAGE_KEY);
    if (!raw) {
      return { success: false, message: 'Nenhuma solicitação de código ativa. Solicite um novo código.' };
    }

    try {
      const pending: PasswordResetPending = JSON.parse(raw);
      if (Date.now() > pending.expiresAt) {
        localStorage.removeItem(RESET_STORAGE_KEY);
        return { success: false, message: 'O código de confirmação expirou. Solicite um novo código.' };
      }

      const cleanCode = codeInput.replace(/\D/g, '').trim();
      if (cleanCode !== pending.code) {
        return { success: false, message: 'Código de confirmação incorreto. Verifique o código enviado ao seu e-mail.' };
      }

      return { 
        success: true, 
        message: 'Código de confirmação validado com sucesso! Identidade confirmada.' 
      };
    } catch {
      return { success: false, message: 'Erro ao validar o código. Solicite novamente.' };
    }
  };

  // 3. Concluir redefinição de senha após validação do código
  const completePasswordResetWithCode = async (
    usernameOrEmailInput: string,
    codeInput: string,
    newPasswordInput: string
  ): Promise<{ success: boolean; message: string }> => {
    const raw = localStorage.getItem(RESET_STORAGE_KEY);
    if (!raw) {
      return { success: false, message: 'Sessão de redefinição expirada. Inicie o processo novamente.' };
    }

    const pending: PasswordResetPending = JSON.parse(raw);
    if (Date.now() > pending.expiresAt) {
      localStorage.removeItem(RESET_STORAGE_KEY);
      return { success: false, message: 'O código de confirmação expirou. Solicite um novo código.' };
    }

    const cleanCode = codeInput.replace(/\D/g, '').trim();
    if (cleanCode !== pending.code) {
      return { success: false, message: 'Código de confirmação inválido.' };
    }

    const newPass = newPasswordInput.trim();
    if (!newPass || newPass.length < 4) {
      return { success: false, message: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    const currentUsers = getStoredUsers();
    const userIndex = currentUsers.findIndex(
      u => u.username.toLowerCase() === pending.username.toLowerCase()
    );

    if (userIndex === -1) {
      return { success: false, message: 'Conta de usuário não encontrada.' };
    }

    currentUsers[userIndex].password = newPass;
    saveStoredUsers(currentUsers);
    setUsersList([...currentUsers]);
    localStorage.removeItem(RESET_STORAGE_KEY);

    return {
      success: true,
      message: `Identidade conferida e nova senha cadastrada com sucesso para ${currentUsers[userIndex].name}!`
    };
  };

  // Admin quick reset
  const quickAdminResetPassword = async (usernameInput: string, newPasswordInput: string): Promise<{ success: boolean; message: string }> => {
    const targetUser = usernameInput.trim().toLowerCase();
    const newPass = newPasswordInput.trim();

    if (!newPass || newPass.length < 4) {
      return { success: false, message: 'A nova senha deve ter pelo menos 4 caracteres.' };
    }

    const currentUsers = getStoredUsers();
    const userIndex = currentUsers.findIndex(u => u.username.toLowerCase() === targetUser);

    if (userIndex === -1) {
      return { success: false, message: `Usuário "${usernameInput}" não encontrado.` };
    }

    currentUsers[userIndex].password = newPass;
    saveStoredUsers(currentUsers);
    setUsersList([...currentUsers]);

    return { success: true, message: `Senha de "${currentUsers[userIndex].name}" redefinida com sucesso.` };
  };

  // Criar novo login com e-mail pessoal
  const createUser = async (userData: { username: string; name: string; email: string; password: string; role: UserRole }): Promise<{ success: boolean; message: string }> => {
    const trimmedUser = userData.username.trim();
    const trimmedPass = userData.password.trim();
    const trimmedName = userData.name.trim();
    const trimmedEmail = userData.email.trim().toLowerCase();

    if (!trimmedUser || !trimmedPass || !trimmedName || !trimmedEmail) {
      return { success: false, message: 'Preencha todos os campos, incluindo o e-mail pessoal.' };
    }

    const currentUsers = getStoredUsers();
    if (currentUsers.some(u => u.username.toLowerCase() === trimmedUser.toLowerCase())) {
      return { success: false, message: `O login "${trimmedUser}" já está em uso.` };
    }

    if (currentUsers.some(u => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, message: `O e-mail "${trimmedEmail}" já está cadastrado em outra conta.` };
    }

    removeDeletedUsername(trimmedUser);
    const newAccount: UserAccount = {
      username: trimmedUser,
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPass,
      role: userData.role,
      roleLabel: userData.role === 'admin' 
        ? 'Administrador / Gerenciador' 
        : userData.role === 'commercial' 
          ? 'Usuário Comercial' 
          : 'Funcionário',
      createdAt: new Date().toISOString()
    };

    const updated = [...currentUsers, newAccount];
    saveStoredUsers(updated);
    setUsersList(updated);

    return { success: true, message: `Novo login "${trimmedUser}" criado com sucesso!` };
  };

  // Deletar login
  const deleteUser = async (usernameInput: string): Promise<{ success: boolean; message: string }> => {
    const trimmed = usernameInput.trim().toLowerCase();
    if (trimmed === 'admin') {
      return { success: false, message: 'Não é permitido remover a conta principal de administrador.' };
    }

    addDeletedUsername(trimmed);
    const currentUsers = getStoredUsers();
    const filtered = currentUsers.filter(u => u.username.toLowerCase() !== trimmed);
    saveStoredUsers(filtered);
    setUsersList(filtered);

    // If currently logged in user is the deleted one, log them out
    if (user && user.username.toLowerCase() === trimmed) {
      logout();
    }

    return { success: true, message: `Usuário "${usernameInput}" excluído com sucesso.` };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isAdmin: user?.role === 'admin',
      isCommercial: user?.role === 'commercial' || (user?.role === 'user' && (user.roleLabel?.toLowerCase().includes('comercial') || user.username === 'thais paiva' || user.username === 'comercial')),
      isEmployee: user?.role === 'employee' || (user?.role === 'user' && !user.roleLabel?.toLowerCase().includes('comercial')),
      usersList,
      login, 
      logout,
      resetPassword,
      resetPasswordWithEmail,
      requestPasswordResetCode,
      verifyResetCode,
      completePasswordResetWithCode,
      quickAdminResetPassword,
      createUser,
      deleteUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  }
  return context;
}
