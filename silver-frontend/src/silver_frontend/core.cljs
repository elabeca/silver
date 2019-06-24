(ns silver-frontend.core
  (:require [reagent.core :as r :refer [atom]]
            [ajax.core :refer [GET]]))

(defn fetch-summary! [orders]
  (GET "/orders"
    {:handler (fn [resp] (let [{:strs [user_id]} (first resp)] (js/console.log (str "----->" user_id))) (reset! orders resp))
    ; {:handler #(reset! orders (vec %))
      :error-handler (fn [{:strs [status status-text]}]
                        (js/console.log status status-text))}))

(defn home []
  (let [orders (atom nil)]
    (fetch-summary! orders)
    (let [{:strs [user_id order_type]} (first @orders)]
      (js/console.log (str user_id " --- " order_type))
      (fn []
        [:p user_id]))))

(defn start []
  (r/render-component [home]
                            (. js/document (getElementById "app"))))

(defn ^:export init []
  (start))

(defn stop []
  (js/console.log "stop"))
