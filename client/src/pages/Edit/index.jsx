import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  Save,
  Download,
  ExternalLink,
  Code,
  MessageSquare,
  Maximize2,
  Smartphone,
  ChevronLeft,
  Files,
  Undo2,
  Redo2,
  Eye,
  Columns2,
  Globe,
  Briefcase,
  Users,
  Shield,
} from "lucide-react";
import { useSocket } from "@/context/SocketProvider";
import { AuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useProject } from "@/hooks/useProject";
import IframePreview, { DEVICE_FRAMES } from "@/components/IframePreview";
import Dice from "@/components/random/Dice";
import Chat from "@/components/Chat";
import Assets from "@/components/Assets";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Lottie from "react-lottie-player";
import lottieAnimation from "@/assets/lottie/ship.json";
import Confetti from "react-confetti";
import { useSelector, useDispatch } from "react-redux";
import { setIsDeploying } from "@/store/deploymentSlice";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import axios from 'axios';

const ViewOptions = ({ currentView, onViewChange }) => {
  const views = [
    { id: "horizontal", icon: Columns2, tooltip: "Horizontal View" },
    { id: "mobile", icon: Smartphone, tooltip: "Mobile View" },
    { id: "fullscreen", icon: Maximize2, tooltip: "Fullscreen View" },
  ];

  return (
    <div className="flex">
      {views.map((view, index) => (
        <Tooltip key={view.id}>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === view.id ? "default" : "outline"}
              size="icon"
              onClick={() => onViewChange(view.id)}
              className={`w-10 h-10 px-2 ${
                index === 0
                  ? "rounded-l-md rounded-r-none"
                  : index === views.length - 1
                  ? "rounded-r-md rounded-l-none"
                  : "rounded-none"
              } ${index !== 0 ? "-ml-px" : ""}`}
            >
              <view.icon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{view.tooltip}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

const LoaderCircle = () => {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
      <Loader className="animate-spin text-black" size={48} />
    </div>
  );
};

const Edit = () => {
  const navigate = useNavigate();
  const { user, userLoading } = useContext(AuthContext);
  const previewContainerRef = useRef(null);
  const { socket } = useSocket();

  const { shipId } = useParams();

  const { readFile, updateFile, submitting, handledownloadzip } =
    useProject(shipId);

  const [fileContent, setFileContent] = useState("");
  const [isFileLoading, setIsFileLoading] = useState(true);
  const iframeRef = useRef(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const [currentDevice, setCurrentDevice] = useState(DEVICE_FRAMES[0]);
  const [activeTab, setActiveTab] = useState("chat");
  const [currentView, setCurrentView] = useState("horizontal");
  const [hasShownErrorToast, setHasShownErrorToast] = useState(false);

  const [isCodeUpdating, setIsCodeUpdating] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isRedoing, setIsRedoing] = useState(false);
  const [isChatUpdating, setIsChatUpdating] = useState(false);

  const [assets, setAssets] = useState([]);
  const [assetCount, setAssetCount] = useState(0);

  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const [isWebsiteDeployed, setIsWebsiteDeployed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const dispatch = useDispatch();
  const isDeploying = useSelector((state) => state.deployment.isDeploying);

  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt || "";

  const [customDomain, setCustomDomain] = useState("");
  const [showDNSInstructions, setShowDNSInstructions] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [isConnectingDomain, setIsConnectingDomain] = useState(false);

  const fetchAssets = useCallback(async () => {
    if (isDeploying) return; // Don't fetch assets while deploying

    try {
      const { data, error } = await supabase
        .from("ships")
        .select("assets")
        .eq("slug", shipId)
        .single();

      if (error) throw error;

      let parsedAssets = [];
      if (data && data.assets) {
        if (Array.isArray(data.assets)) {
          parsedAssets = data.assets;
        } else if (typeof data.assets === "string") {
          try {
            const parsed = JSON.parse(data.assets);
            parsedAssets = Array.isArray(parsed) ? parsed : [];
          } catch (parseError) {
            console.error("Error parsing assets JSON:", parseError);
          }
        }
      }
      setAssets(parsedAssets);
      setAssetCount(parsedAssets.length);
    } catch (error) {
      console.error("Error fetching assets:", error);
      setAssets([]);
      setAssetCount(0);
    }
  }, [shipId, isDeploying]);

  useEffect(() => {
    if (!isDeploying) {
      fetchAssets();
    }
  }, [fetchAssets, isDeploying]);

  const updateAssets = useCallback((newAssets) => {
    setAssets(newAssets);
    setAssetCount(newAssets.length);
  }, []);

  useEffect(() => {
    if (!userLoading && (!user || !shipId)) {
      navigate("/");
    } else if (!isDeploying) {
      // Load index.html content when the component mounts and not deploying
      loadIndexHtml();
    }
  }, [user, shipId, navigate, userLoading, isDeploying]);

  useEffect(() => {
    const preventScroll = (e) => {
      if (currentView !== "fullscreen" && currentView !== "mobile") {
        e.preventDefault();
      }
    };

    const container = previewContainerRef.current;
    if (container) {
      container.addEventListener("wheel", preventScroll, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", preventScroll);
      }
    };
  }, [currentView]);

  const loadIndexHtml = async () => {
    setIsFileLoading(true);
    setHasShownErrorToast(false); // Reset the flag before loading
    try {
      const content = await readFile(`${shipId}/index.html`);
      setFileContent(content);
    } catch (error) {
      console.error("Failed to read index.html:", error);
      if (!hasShownErrorToast) {
        toast.error("Failed to load index.html");
        setHasShownErrorToast(true);
      }
    } finally {
      setIsFileLoading(false);
    }
    setUnsavedChanges(false);
  };

  const handleFileChange = (value) => {
    setFileContent(value);
    setUnsavedChanges(true);
  };

  const handleFileSave = async () => {
    updateFile(`${shipId}/index.html`, fileContent, () => {
      toast.success("index.html updated!", {
        description: "Your changes are live 👍",
      });
      if (iframeRef.current) {
        iframeRef.current.reload();
      }
      setUnsavedChanges(false);
    });
  };

  const handleUndo = () => {
    setIsUndoing(true);
    socket.emit("undoCodeChange", { shipId });
  };

  const handleRedo = () => {
    setIsRedoing(true);
    socket.emit("redoCodeChange", { shipId });
  };

  const handleUndoResult = (result) => {
    setIsUndoing(false);
    if (result.success) {
      toast.success(result.message);
      setFileContent(result.code);
      if (iframeRef.current) {
        iframeRef.current.reload();
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleRedoResult = (result) => {
    setIsRedoing(false);
    if (result.success) {
      toast.success(result.message);
      setFileContent(result.code);
      if (iframeRef.current) {
        iframeRef.current.reload();
      }
    } else {
      toast.error(result.message);
    }
  };

  const handleCodeUpdate = (updatedCode) => {
    setIsCodeUpdating(true);
    setFileContent(updatedCode);
    setUnsavedChanges(false);
    if (iframeRef.current) {
      iframeRef.current.reload();
    }
    setTimeout(() => setIsCodeUpdating(false), 1000);
  };

  const handleChatUpdate = (updatedCode) => {
    setIsChatUpdating(true);
    setFileContent(updatedCode);
    setUnsavedChanges(false);
    if (iframeRef.current) {
      iframeRef.current.reload();
    }
    setTimeout(() => setIsChatUpdating(false), 1000);
  };

  useEffect(() => {
    if (socket) {
      socket.on("undoResult", handleUndoResult);
      socket.on("redoResult", handleRedoResult);
      socket.on("codeUpdate", handleCodeUpdate);
      socket.on("websiteDeployed", handleWebsiteDeployed);
      socket.on("project_started", () => dispatch(setIsDeploying(true)));

      return () => {
        socket.off("undoResult", handleUndoResult);
        socket.off("redoResult", handleRedoResult);
        socket.off("codeUpdate", handleCodeUpdate);
        socket.off("websiteDeployed", handleWebsiteDeployed);
        socket.off("project_started");
      };
    }
  }, [socket, dispatch]);

  const shuffleDevice = () => {
    const newDevice =
      DEVICE_FRAMES[Math.floor(Math.random() * DEVICE_FRAMES.length)];
    setCurrentDevice(newDevice);
    toast(`Congratulations! 🎉`, {
      description: `You've changed the device to ${newDevice}`,
      position: "bottom-right",
      duration: 1500,
    });
  };

  const handleAssetsUpdate = (newAssets) => {
    setAssets((prevAssets) => [...prevAssets, ...newAssets]);
    setAssetCount((prevCount) => prevCount + newAssets.length);
  };

  const handleWebsiteDeployed = useCallback(() => {
    setIsWebsiteDeployed(true);
    dispatch(setIsDeploying(false));
    setShowConfetti(true);
    toast.success("Your website has been deployed!");
    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
  }, [dispatch]);

  const handleCustomDomainSubmit = (e) => {
    e.preventDefault();
    setShowDNSInstructions(true);
  };

  const handleConfirmDomain = async () => {
    setIsConnectingDomain(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/add-custom-domain`, {
        domain: customDomain,
        shipSlug: shipId 
      });

      if (response.status === 200) {
        setShowConfirmationDialog(true);
        toast.success("Custom domain connection initiated successfully!");
      } else {
        throw new Error("Failed to connect custom domain");
      }
    } catch (error) {
      console.error("Error connecting custom domain:", error);
      toast.error("Failed to connect custom domain. Please try again.");
    } finally {
      setIsConnectingDomain(false);
    }
  };

  if (!user || !shipId) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="mx-auto flex flex-col h-screen p-4 bg-background text-foreground">
        {showConfetti && <Confetti />}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            {!isDeploying && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/" className="text-foreground hover:text-primary">
                    <ChevronLeft className="w-6 h-6" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Back to Home</TooltipContent>
              </Tooltip>
            )}
            <h1 className="text-xl font-semibold">Customise your portfolio</h1>
          </div>
          {!isDeploying && (
            <div className="flex flex-row items-start md:items-center md:space-y-0 md:space-x-2 w-full md:w-auto">
              <div className="flex w-full md:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleUndo}
                      className="w-10 h-10 px-2 rounded-l-md rounded-r-none"
                    >
                      <Undo2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRedo}
                      className="w-10 h-10 px-2 rounded-l-none rounded-r-md -ml-px"
                    >
                      <Redo2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex flex-row items-center space-x-2">
                <Button
                  variant={`${showMobilePreview ? "default" : "outline"}`}
                  onClick={() => setShowMobilePreview(!showMobilePreview)}
                  className="w-auto h-10 md:hidden"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>

                <div className="hidden md:flex">
                  <ViewOptions
                    currentView={currentView}
                    onViewChange={setCurrentView}
                  />
                </div>

                <Button
                  variant="secondary"
                  size="icon"
                  className="w-10 h-10 md:w-auto md:px-2"
                  onClick={() => {
                    handledownloadzip();
                    toast("Project will be downloaded shortly!");
                  }}
                >
                  <Download className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Export Project</span>
                </Button>

                <Button
                  variant="default"
                  size="icon"
                  className="w-10 h-10 md:w-auto md:px-2"
                  onClick={() => {
                    window.open(
                      `${import.meta.env.VITE_MAIN_URL}/site/${shipId}/`,
                      "_blank"
                    );
                  }}
                >
                  <ExternalLink className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Preview Live Site</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="md:hidden flex flex-col flex-1 overflow-hidden rounded-lg border border-border">
          <div className={showMobilePreview ? "hidden" : "flex-1"}>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              <div className="bg-card p-2 flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="chat" className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    AI Chat
                  </TabsTrigger>
                  {!isDeploying && (
                    <>
                      <TabsTrigger value="code" className="flex items-center">
                        <Code className="w-4 h-4 mr-2" />
                        Code
                      </TabsTrigger>
                      <TabsTrigger value="assets" className="flex items-center">
                        <Globe className="w-4 h-4 mr-2" />
                        <span className="text-sm">Custom Domain</span>
                        {assetCount === 0 ? null : (
                          <Badge
                            variant="default"
                            className="rounded-full ml-2"
                          >
                            {assetCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>
                {activeTab === "code" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submitting}
                    onClick={handleFileSave}
                    className="text-muted-foreground hover:text-foreground border-border hover:bg-accent"
                  >
                    <Save className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:block">Save</span>
                  </Button>
                )}
              </div>
              <TabsContent value="chat" className="flex-grow overflow-hidden">
                <Chat
                  shipId={shipId}
                  onCodeUpdate={handleChatUpdate}
                  onAssetsUpdate={handleAssetsUpdate}
                  assets={assets}
                  assetCount={assetCount}
                  initialPrompt={initialPrompt}
                  isDeploying={isDeploying}
                />
              </TabsContent>
              <TabsContent value="code" className="flex-grow overflow-hidden">
                <div className="h-full flex flex-col bg-background">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="font-bold text-foreground">
                      index.html
                    </span>
                    {unsavedChanges && (
                      <Badge variant="secondary">Unsaved changes</Badge>
                    )}
                  </div>
                  {isFileLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="relative w-16 h-16">
                        <div className="absolute top-0 left-0 w-full h-full border-4 border-muted rounded-full animate-pulse"></div>
                        <div className="absolute top-0 left-0 w-full h-full border-t-4 border-primary rounded-full animate-spin"></div>
                      </div>
                    </div>
                  ) : (
                    <Editor
                      language="html"
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        scrollbar: {
                          vertical: "visible",
                          horizontal: "visible",
                        },
                        fontSize: 14,
                        lineNumbers: "on",
                        glyphMargin: false,
                        folding: true,
                        lineDecorationsWidth: 0,
                        lineNumbersMinChars: 3,
                        renderLineHighlight: "all",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                      value={fileContent}
                      onChange={handleFileChange}
                    />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="assets" className="flex-grow overflow-hidden">
                <Assets
                  shipId={shipId}
                  assets={assets}
                  onAssetsChange={updateAssets}
                  fetchAssets={fetchAssets}
                />
              </TabsContent>
            </Tabs>
          </div>
          <div className={showMobilePreview ? "flex-1" : "hidden"}>
            <div
              ref={previewContainerRef}
              className="h-full overflow-hidden relative"
            >
              <IframePreview
                ref={iframeRef}
                slug={shipId}
                isLoading={isFileLoading}
                isDeploying={isDeploying}
              />
              {(isUndoing || isRedoing || isCodeUpdating || isChatUpdating) && (
                <LoaderCircle />
              )}
            </div>
          </div>
        </div>
        <div className="hidden md:block flex-1">
          <ResizablePanelGroup
            direction="horizontal"
            className="flex-1 overflow-hidden rounded-lg border border-border"
          >
            {currentView !== "fullscreen" && (
              <ResizablePanel defaultSize={30} minSize={30}>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="h-full flex flex-col"
                >
                  <div className="bg-card p-2 flex justify-between items-center">
                    <TabsList>
                      <TabsTrigger value="chat" className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        AI Chat
                      </TabsTrigger>
                      {!isDeploying && (
                        <>
                          <TabsTrigger
                            value="code"
                            className="flex items-center"
                          >
                            <Code className="w-4 h-4 mr-2" />
                            Code
                          </TabsTrigger>
                          <TabsTrigger
                            value="domain"
                            className="flex items-center"
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            <span className="text-sm">Custom Domain</span>
                            {assetCount === 0 ? null : (
                              <Badge
                                variant="default"
                                className="rounded-full ml-2"
                              >
                                {assetCount}
                              </Badge>
                            )}
                          </TabsTrigger>
                        </>
                      )}
                    </TabsList>
                    {activeTab === "code" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={submitting}
                            onClick={handleFileSave}
                            className="text-muted-foreground hover:text-foreground border-border hover:bg-accent"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save Changes</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <TabsContent
                    value="chat"
                    className="flex-grow overflow-hidden"
                  >
                    <Chat
                      shipId={shipId}
                      onCodeUpdate={handleChatUpdate}
                      onAssetsUpdate={handleAssetsUpdate}
                      assets={assets}
                      assetCount={assetCount}
                      initialPrompt={initialPrompt}
                      isDeploying={isDeploying}
                    />
                  </TabsContent>
                  <TabsContent
                    value="code"
                    className="flex-grow overflow-hidden"
                  >
                    <div className="h-full flex flex-col bg-background">
                      <div className="flex items-center gap-2 px-2 py-1">
                        <span className="font-bold text-foreground">
                          index.html
                        </span>
                        {unsavedChanges && (
                          <Badge variant="secondary">Unsaved changes</Badge>
                        )}
                      </div>
                      {isFileLoading ? (
                        <div className="flex justify-center items-center h-full">
                          <div className="relative w-16 h-16">
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-muted rounded-full animate-pulse"></div>
                            <div className="absolute top-0 left-0 w-full h-full border-t-4 border-primary rounded-full animate-spin"></div>
                          </div>
                        </div>
                      ) : (
                        <Editor
                          language="html"
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: false },
                            scrollbar: {
                              vertical: "visible",
                              horizontal: "visible",
                            },
                            fontSize: 14,
                            lineNumbers: "on",
                            glyphMargin: false,
                            folding: true,
                            lineDecorationsWidth: 0,
                            lineNumbersMinChars: 3,
                            renderLineHighlight: "all",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                          }}
                          value={fileContent}
                          onChange={handleFileChange}
                        />
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent
                    value="assets"
                    className="flex-grow overflow-hidden"
                  >
                    <Assets
                      shipId={shipId}
                      assets={assets}
                      onAssetsChange={updateAssets}
                      fetchAssets={fetchAssets}
                    />
                  </TabsContent>
                  <TabsContent
                    value="domain"
                    className="flex-grow overflow-hidden p-4"
                  >
                    <p className="mb-4">
                      Enhance your portfolio with a custom domain. Benefits include:
                    </p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-center">
                        <Briefcase className="w-5 h-5 mr-2 text-primary" />
                        <span>Improved branding and professionalism</span>
                      </li>
                      <li className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-primary" />
                        <span>Better memorability for potential employers or clients</span>
                      </li>
                      <li className="flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-primary" />
                        <span>Increased control over your online presence</span>
                      </li>
                    </ul>
                    {!showDNSInstructions ? (
                      <form onSubmit={handleCustomDomainSubmit} className="space-y-4">
                        <div className="flex space-x-2">
                          <Input
                            type="text"
                            placeholder="Enter your custom domain (e.g., portfolio.yourdomain.com)"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            className="flex-grow"
                          />
                          <Button type="submit" disabled={!customDomain}>Connect</Button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold">DNS Configuration Instructions</h3>
                        <p>Please add the following A record to your domain's DNS settings:</p>
                        <div className="bg-muted p-4 rounded">
                          <p><strong>Type:</strong> A</p>
                          <p><strong>Name:</strong> @ or portfolio (or your subdomain)</p>
                          <p><strong>Value:</strong> 184.164.80.42</p>
                        </div>
                        <p>Once you've added the DNS record, click the button below to confirm:</p>
                        <Button 
                          onClick={handleConfirmDomain} 
                          disabled={isConnectingDomain}
                        >
                          {isConnectingDomain ? "Connecting..." : "Confirm DNS Settings"}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </ResizablePanel>
            )}
            {currentView !== "fullscreen" && <ResizableHandle withHandle />}
            <ResizablePanel
              defaultSize={currentView === "fullscreen" ? 100 : 70}
            >
              <div
                ref={previewContainerRef}
                className="h-full overflow-hidden relative"
              >
                <IframePreview
                  device={currentView === "mobile" ? currentDevice : null}
                  ref={iframeRef}
                  slug={shipId}
                  currentView={currentView}
                  isLoading={isFileLoading}
                  isDeploying={isDeploying}
                />
                {(isUndoing ||
                  isRedoing ||
                  isCodeUpdating ||
                  isChatUpdating) && <LoaderCircle />}
                {currentView === "mobile" && (
                  <div className="absolute bottom-8 right-8 z-10">
                    <Dice onRoll={shuffleDevice} />
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Domain Connection in Progress</DialogTitle>
            <DialogDescription>
              Your custom domain ({customDomain}) is being connected to your portfolio. This process may take up to 24 hours to complete. We'll send you an email confirmation once it's live.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowConfirmationDialog(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default Edit;