import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Confetti from "react-confetti";
import {
  Zap,
  Image,
  Globe,
  Crown,
  Loader2,
  Link,
  Copy,
  BadgeHelpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { format, addYears } from "date-fns";

const SubscriptionDialog = ({ isOpen, onClose, isSubscribed, user }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [nextBillingDate, setNextBillingDate] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);

  useEffect(() => {
    // Handle window resize for confetti
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const addRazorpayScript = () => {
      const rzpPaymentForm = document.getElementById("rzp_payment_form");

      if (rzpPaymentForm && !rzpPaymentForm.hasChildNodes()) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/payment-button.js";
        script.async = true;
        script.dataset.payment_button_id = "pl_PH9UiM0zlSM2Xw";

        // Add click handler to close dialog
        rzpPaymentForm.addEventListener("click", () => {
          setTimeout(() => onClose(false), 100);
        });

        // Check if the button is rendered using MutationObserver
        const observer = new MutationObserver((mutations, obs) => {
          const razorpayButton = document.querySelector(
            ".razorpay-payment-button"
          );
          if (razorpayButton) {
            setIsPaymentLoading(false);
            obs.disconnect(); // Stop observing once button is found
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        rzpPaymentForm.appendChild(script);
      }
    };

    if (isOpen && !isSubscribed) {
      setIsPaymentLoading(true);
      setTimeout(addRazorpayScript, 100);
    }

    // Subscribe to realtime changes using channel
    const channel = supabase
      .channel("user_profiles_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_profiles",
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          if (
            payload.new.subscription_status === "active" &&
            payload.old.subscription_status !== "active"
          ) {
            setTimeout(() => {
              setShowConfetti(true);
              toast.success("Welcome to ShipStation Pro! 🚀", {
                description: "Your account has been upgraded successfully!",
                duration: 12000, // Long duration for better visibility
              });

              setTimeout(() => setShowConfetti(false), 3000);
            }, 10000); // Delay to ensure payment modal confirmation and redirection from gateway
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      setIsPaymentLoading(true);
      supabase.removeChannel(channel);
    };
  }, [isOpen, isSubscribed, onClose, user?.id]);

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (!user?.id || !isSubscribed) return;

      try {
        // Fetch user profile to get subscription start date
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("subscription_start_date")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        if (profileData?.subscription_start_date) {
          const nextBilling = addYears(
            new Date(profileData.subscription_start_date),
            1
          );
          setNextBillingDate(nextBilling);
        }

        // Fetch recent payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (paymentsError) throw paymentsError;
        setRecentPayments(paymentsData || []);
      } catch (error) {
        console.error("Error fetching subscription details:", error);
        toast.error("Failed to load subscription details");
      }
    };

    fetchSubscriptionDetails();
  }, [user?.id, isSubscribed]);

  const handleEmailCopy = () => {
    if (user?.email) {
      navigator.clipboard
        .writeText(user.email)
        .then(() => {
          toast.success("Email address copied to clipboard");
        })
        .catch((err) => {
          console.error("Failed to copy email: ", err);
          toast.error("Failed to copy email address");
        });
    }
  };

  const renderPaymentButton = () => {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-4">
        <form id="rzp_payment_form" className="w-full flex justify-center" />
        {isPaymentLoading && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Initializing secure payment options...</span>
          </div>
        )}
        {!isPaymentLoading && (
          <span
            className="text-sm text-muted-foreground"
            onClick={handleEmailCopy}
          >
            Use email address
            <span className="font-semibold underline cursor-pointer mx-1 inline-flex items-center gap-1">
              {user?.email}
              <Copy className="w-4 h-4" />
            </span>{" "}
            while completing the payment.
          </span>
        )}
      </div>
    );
  };

  const renderSubscriptionContent = () => {
    if (!isSubscribed) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Upgrade to ShipStation Pro
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Unlock powerful features to enhance your portfolio, for just ₹999
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4">
            {[
              {
                icon: Zap,
                title: "Unlimited AI Refinements",
                description:
                  "Continuously improve your portfolio with AI assistance",
              },
              {
                icon: Globe,
                title: "Custom Domain",
                description: "Connect your own domain for better branding",
              },
              {
                icon: Image,
                title: "Unlimited Assets",
                description:
                  "Add as many images, videos, and files as you need",
              },
              {
                icon: Crown,
                title: "Premium Support",
                description: "Get priority assistance when you need it",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-slate-800/35 rounded-lg"
              >
                <feature.icon className="w-6 h-6 text-primary" />
                <div>
                  <h4 className="font-semibold text-foreground">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex items-center sm:justify-center w-full">
            {renderPaymentButton()}
          </DialogFooter>
        </>
      );
    } else {
      return (
        <>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl">Your Subscription</DialogTitle>
            <DialogDescription className="text-gray-500">
              Manage your premium subscription
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="font-semibold text-lg text-foreground">
                Current Plan: Pro
              </h3>
              <p className="text-sm text-muted-foreground">
                Next billing date:{" "}
                {nextBillingDate
                  ? format(nextBillingDate, "MMMM d, yyyy")
                  : "Loading..."}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Recent Payments</h4>
              {recentPayments.length > 0 ? (
                recentPayments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-2 bg-secondary rounded-lg"
                  >
                    <div className="flex items-center space-x-2 text-foreground">
                      <FileText className="w-4 h-4" />
                      <span>
                        {format(new Date(payment.created_at), "MMMM d, yyyy")}
                      </span>
                    </div>
                    {/* <span className="text-foreground">₹{payment.amount}</span> */}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No payment history available
                </p>
              )}
            </div>
          </div>
          {/* <DialogFooter className="flex justify-start">
            <Button variant="link">Cancel Subscription</Button>
          </DialogFooter> */}
        </>
      );
    }
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          style={{ position: "fixed", top: 0, left: 0, zIndex: 1000 }}
          numberOfPieces={500}
          recycle={false}
          gravity={0.2}
        />
      )}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {renderSubscriptionContent()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionDialog;
