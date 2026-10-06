"use client";

import { useState } from "react";
import { Package, Heart, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"orders" | "wishlist" | "settings">("orders");

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-card p-6 rounded-[24px] border border-border mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-2xl">
                JD
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">John Doe</h3>
                <p className="text-sm text-muted-foreground">john.doe@example.com</p>
              </div>
            </div>
            
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("orders")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === "orders" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Package className="h-5 w-5" /> My Orders
              </button>
              <button
                onClick={() => setActiveTab("wishlist")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === "wishlist" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Heart className="h-5 w-5" /> Wishlist
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === "settings" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Settings className="h-5 w-5" /> Settings
              </button>
              <div className="border-t my-2" />
              <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-5 w-5" /> Sign Out
              </button>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 bg-card p-8 rounded-[32px] border border-border min-h-[500px]">
          {activeTab === "orders" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Order History</h2>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border border-border rounded-[16px] p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-foreground">#NXS-{1000 + i}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Delivered</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Placed on Oct {24 - i}, 2024</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg mb-1">${(1299.00 - (i * 150)).toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">{i + 1} item{i !== 0 && 's'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "wishlist" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">My Wishlist</h2>
              <div className="text-center py-16 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Your wishlist is currently empty.</p>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
              <div className="max-w-md space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Personal Information</h4>
                  <div className="space-y-3">
                    <input type="text" defaultValue="John Doe" className="w-full px-4 py-2 border rounded-xl bg-muted/50" />
                    <input type="email" defaultValue="john.doe@example.com" className="w-full px-4 py-2 border rounded-xl bg-muted/50" />
                  </div>
                </div>
                <Button className="rounded-full px-6">Save Changes</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
