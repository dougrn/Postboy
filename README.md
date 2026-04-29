# ⚡ Postboy
> **O cliente de API local-first definitivo para testes de alta performance.**

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![UI](https://img.shields.io/badge/UI-Glassmorphism-purple?style=for-the-badge)](frontend/styles.css)

**Postboy** é uma alternativa leve, extremamente rápida e focada em privacidade para os clientes de API tradicionais. Projetado com uma interface moderna em **Glassmorphism Dark Mode**, ele oferece uma experiência fluida para desenvolvedores que valorizam velocidade, privacidade e estética.

---

## 🎨 Preview
![Postboy Showcase](https://raw.githubusercontent.com/placeholder/postboy/main/showcase.png)
*Uma interface moderna e minimalista projetada para foco e produtividade.*

---

## 🔥 Principais Funcionalidades

### 🚀 Performance e Rede
- **Motor Async**: Equipado com `HTTPX` para requisições concorrentes ultrarrápidas.
- **Injeção de Variáveis**: Suporte completo para substituição de `{{variavel}}` em URLs, headers e corpos (body).
- **Multi-Ambiente**: Alterne facilmente entre contextos de Local, Staging e Produção.

### 💎 Experiência do Usuário (UX)
- **Interface Glassmorphism**: Um visual dark sofisticado com efeitos de transparência e desfoque (blur).
- **Modais Inteligentes**: Sistema de modais customizados e não-bloqueantes para um fluxo de trabalho contínuo.
- **Otimizado para Scroll**: Lida com respostas JSON gigantescas (vários MBs) sem travar a interface.
- **Sincronização Postman**: Importação instantânea para suas coleções existentes (v2.1).

### 🛡️ Privacidade e Segurança
- **Local-First**: Seus dados nunca saem da sua máquina. Sem nuvem, sem necessidade de login.
- **Armazenamento JSON**: Persistência em arquivos JSON legíveis na pasta `/data`.

---

## 📦 Instalação e Configuração

### 1. Requisitos
- Python 3.10+
- Pip (Gerenciador de pacotes do Python)

### 2. Início Rápido
```bash
# Clone o repositório
git clone https://github.com/dougrn/PostBoy.git

# Entre no diretório
cd PostBoy

# Instale as dependências
pip install -r requirements.txt

# Execute o motor
python main.py
```

### 3. Acesso ao Dashboard
Abra seu navegador favorito e acesse:
👉 **[http://localhost:8000](http://localhost:8000)**

---

## 📂 Anatomia do Projeto
```bash
├── 🐍 backend/     # API, modelos e motor de requisições em Python
├── 🎨 frontend/    # Interface HTML/CSS (Glassmorphism) e Vanilla JS
├── 📂 data/        # Suas coleções locais e dados de ambiente (ignorado pelo git)
├── 📚 specs/       # Documentação técnica e roadmap
└── 🚀 main.py      # Ponto de entrada da aplicação
```

---

## 🛠️ Tecnologias Utilizadas
- **Core**: [FastAPI](https://fastapi.tiangolo.com/)
- **Networking**: [HTTPX](https://www.python-httpx.org/)
- **Estética**: Vanilla CSS3 + [Inter Font](https://fonts.google.com/specimen/Inter)
- **Lógica**: Vanilla JS (ES6+)

---

## 🗺️ Roadmap
- [ ] Suporte a Scripts Pré-request e Post-request (JS)
- [ ] Visualizadores de Resposta (Gráficos e HTML)
- [ ] Exportação para cURL / Postman
- [ ] Assistente completo de OAuth2

## 🤝 Contribuições
Contribuições são o que tornam a comunidade open source um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer será **muito apreciada**.

---

## 📄 Licença
Distribuído sob a **Licença MIT**. Veja `LICENSE` para mais informações.

<p align="center">
  Desenvolvido com ❤️ pela Equipe Postboy
</p>
