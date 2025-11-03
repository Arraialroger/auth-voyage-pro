import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, ArrowRight, Home } from 'lucide-react';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {
    signIn,
    user,
    session
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    // Só redirecionar se houver usuário E sessão válida
    if (user && session) {
      navigate('/agenda');
    }
  }, [user, session, navigate]);
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Preload da Agenda para evitar ChunkLoadError na navegação
    void import('./Agenda').catch(() => {});
    
    const {
      error
    } = await signIn(email, password);
    if (!error) {
      navigate('/agenda');
    }
    setIsLoading(false);
  };
  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Arraial Odonto
          </h1>
          <p className="text-muted-foreground">
            Digite suas credenciais para acessar o sistema
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-elegant animate-fade-in">
          <form onSubmit={handleSignIn}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Entrar</CardTitle>
              <CardDescription className="text-center">
                Digite seus dados para acessar sua agenda
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary" 
                    required 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary" 
                    required 
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity group" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Contas são criadas pela administração.</p>
                <p>Entre em contato para solicitar acesso.</p>
              </div>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <Home className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}