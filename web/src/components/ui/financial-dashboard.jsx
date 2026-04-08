import * as React from "react";
import { motion } from "framer-motion";
import { ChevronRight, History, Library, Search } from "lucide-react";
import { cn } from "@/lib/utils";

function IconWrapper({ icon: Icon, className }) {
  return (
    <div className={cn("p-2 rounded-full flex items-center justify-center", className)}>
      <Icon className="w-5 h-5" />
    </div>
  );
}

export function FinancialDashboard({ quickActions, recentActivity, financialServices }) {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-card text-card-foreground rounded-2xl border shadow-card max-w-5xl mx-auto"
    >
      <div className="p-4 md:p-6">
        <motion.div variants={itemVariants} className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            readOnly
            value=""
            placeholder="Use the market search below to jump to any ticker..."
            className="bg-background w-full border border-input rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background outline-none"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center justify-center text-xs font-mono text-muted-foreground bg-muted p-1 rounded-md">
            Live
          </kbd>
        </motion.div>

        <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
          {quickActions.map((action, index) => (
            <motion.button
              type="button"
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="group text-center p-3 rounded-xl cursor-pointer transition-colors hover:bg-muted/70"
              onClick={action.onClick}
            >
              <IconWrapper
                icon={action.icon}
                className="mx-auto mb-2 bg-muted group-hover:bg-background text-muted-foreground"
              />
              <p className="text-sm font-medium">{action.title}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </motion.button>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recent market activity</h2>
          </div>
          <motion.ul variants={containerVariants} className="space-y-4">
            {recentActivity.map((activity, index) => (
              <motion.li key={index} variants={itemVariants} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {React.isValidElement(activity.icon) ? (
                    activity.icon
                  ) : (
                    <IconWrapper icon={activity.icon} className="bg-muted text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "text-sm font-mono p-1 px-2 rounded border",
                    activity.amount > 0
                      ? "text-positive border-positive/30 bg-positive/10"
                      : "text-negative border-negative/30 bg-negative/10"
                  )}
                >
                  {activity.amount > 0 ? "+" : "-"}${Math.abs(activity.amount).toFixed(2)}
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <Library className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Financial services</h2>
          </div>
          <motion.div variants={containerVariants} className="space-y-2">
            {financialServices.map((service, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{
                  scale: 1.01,
                  boxShadow: "0px 4px 10px hsla(var(--foreground), 0.06)",
                  backgroundColor: "hsl(var(--muted))",
                }}
                className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <IconWrapper icon={service.icon} className="bg-muted-foreground/10" />
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {service.title}
                      {service.isPremium && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Premium
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                </div>
                {service.hasAction && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
