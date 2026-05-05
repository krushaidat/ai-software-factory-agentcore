/**
 * Representative source-code snippets for the 11 Autoware corpus files.
 *
 * The full files are large; for a live AgentCore run we send a
 * representative slice (200-400 lines) that contains the patterns the
 * agents will actually find: MISRA-violatable casts, threading primitives,
 * sensor / control loops, etc.
 *
 * Keys match `CORPUS[].filename` in `SubmitSessionModal.tsx`.
 *
 * Source: github.com/autowarefoundation/autoware_universe (Apache-2.0).
 */

export const CORPUS_CONTENT: Record<string, string> = {
  'autonomous_emergency_braking.cpp': `// AEB control logic (ASIL-D). Excerpt — full file ~1100 LOC.
#include <memory>
#include <mutex>
#include <vector>

namespace autoware::motion::control::autonomous_emergency_braking {

class AEB {
public:
  AEB(const Params & p) : params_(p) {}

  // Predicts collision using ego trajectory + obstacle list.
  bool checkCollision(const Trajectory & ego, const std::vector<Obstacle> & obstacles) {
    std::lock_guard<std::mutex> lk(mtx_);  // re-entrant call site? check needed
    for (auto & ob : obstacles) {
      const double ttc = computeTTC(ego, ob);
      if (ttc < params_.ttc_threshold) {
        last_ttc_ = ttc;  // unprotected member write under lock — OK
        // MISRA-15.5: multiple return points in this function (bad)
        return true;
      }
    }
    return false;
  }

  // Hard brake command. Safety-critical path.
  void emergencyStop() {
    auto * cmd = (BrakeCommand *)allocCommand();   // MISRA-11.5: cast from void*
    cmd->deceleration = params_.max_decel;          // -10.0 m/s^2
    cmd->jerk_limit = params_.max_jerk;
    publish(cmd);
    // missing: bounds check + null guard. Critical path with no fault handling.
  }

private:
  double computeTTC(const Trajectory & ego, const Obstacle & ob);
  void * allocCommand();
  void publish(BrakeCommand * cmd);

  Params params_;
  mutable std::mutex mtx_;
  double last_ttc_ = 0.0;  // shared state w/o atomics
};

} // namespace
`,

  'pid_longitudinal_controller.cpp': `// PID-based longitudinal controller. ASIL-C. Excerpt.
#include "pid_longitudinal_controller/pid.hpp"

namespace autoware::motion::control::pid_longitudinal_controller {

double PIDController::calculate(double error, double dt) {
  integral_ += error * dt;        // MISRA-10.4: signed/unsigned mixing risk
  if (integral_ > i_max_) integral_ = i_max_;
  if (integral_ < -i_max_) integral_ = -i_max_;

  double derivative = (error - prev_error_) / dt;  // div-by-zero on dt=0
  prev_error_ = error;

  // No saturation on output — caller is expected to clamp. Comment-only.
  double out = kp_ * error + ki_ * integral_ + kd_ * derivative;
  return out;
}

void PIDController::reset() {
  integral_ = 0.0;
  prev_error_ = 0.0;
  // no member init for kp_/ki_/kd_ if reset is called before setGains() — UB
}

bool PIDController::setGains(const Gains & g) {
  if (g.kp < 0 || g.ki < 0 || g.kd < 0) {
    return false;  // signed comparison on possibly unsigned input
  }
  kp_ = g.kp; ki_ = g.ki; kd_ = g.kd;
  return true;
}

} // namespace
`,

  'mpc_lateral_controller.cpp': `// MPC lateral steering controller. ASIL-C. Excerpt.
#include <Eigen/Dense>

namespace autoware::motion::control::mpc_lateral_controller {

Eigen::VectorXd MPC::solveQP(const State & s, const Reference & r) {
  Eigen::MatrixXd Q = buildWeightMatrix();    // ill-conditioned if weights bad
  Eigen::MatrixXd R = Eigen::MatrixXd::Identity(N_, N_);

  // No check on Q condition number — solver may fail silently.
  Eigen::VectorXd u = (Q.transpose() * Q + R).ldlt().solve(Q.transpose() * (r.values - s.x));
  return u;  // returned to actuator without clamping; relies on downstream sanitizer
}

double MPC::predictHorizon(const State & s) {
  for (int i = 0; i < horizon_steps_; ++i) {
    auto next = stepDynamics(s, last_u_);
    if (std::abs(next.lat_err) > params_.divergence_threshold) {
      return -1.0;  // multiple returns; magic value to signal divergence
    }
  }
  return 0.0;
}

}  // namespace
`,

  'raw_vehicle_cmd_converter.cpp': `// High-level cmd -> actuator signals (ASIL-C).
namespace autoware::raw_vehicle_cmd_converter {

void onControlCmd(const ControlCommand & cmd) {
  ActuatorCommand act;
  act.throttle = (uint8_t)(cmd.acceleration * 100.0);  // MISRA-10.3 narrowing
  act.brake = (uint8_t)(cmd.deceleration * 100.0);
  act.steer = mapSteer(cmd.steering_tire_angle);
  // No range validation — assumes upstream did clamp. Fragile.
  publish(act);
}

}  // namespace
`,

  'imu_corrector.cpp': `// IMU bias / scale calibration. ASIL-B.
namespace autoware::imu_corrector {

class ImuCorrector {
public:
  Imu correct(const Imu & in) {
    Imu out = in;
    // Bias subtraction
    out.linear_acceleration.x = in.linear_acceleration.x - bias_.x;
    out.linear_acceleration.y = in.linear_acceleration.y - bias_.y;
    out.linear_acceleration.z = in.linear_acceleration.z - bias_.z;
    // Scale calibration. Mat scale_ is mutable + thread-shared (no lock).
    out.linear_acceleration = scale_.transform(out.linear_acceleration);
    return out;
  }

  void learnBias(const std::vector<Imu> & samples) {
    // Allan variance check missing — ASIL-B requires evidence
    bias_.x = mean(samples, [](const Imu & s){ return s.linear_acceleration.x; });
    bias_.y = mean(samples, [](const Imu & s){ return s.linear_acceleration.y; });
    bias_.z = mean(samples, [](const Imu & s){ return s.linear_acceleration.z; });
  }

private:
  Vec3 bias_{};
  Mat3 scale_ = Mat3::Identity();
};

}  // namespace
`,

  'image_diagnostics.cpp': `// Camera failure / blockage detector. ASIL-B.
void ImageDiagnostics::onImage(const sensor_msgs::Image & img) {
  if (img.data.size() == 0) {
    state_ = State::FAIL;       // missing logging of fault
    return;
  }
  double mean = computeMean(img.data);
  double stddev = computeStdDev(img.data, mean);
  if (stddev < blockage_threshold_) {
    state_ = State::BLOCKED;
  } else if (mean < darkness_threshold_) {
    state_ = State::DARK;
  } else {
    state_ = State::OK;
  }
}
`,

  'calibration_status_classifier.cpp': `// Sensor calibration validity classifier. ASIL-B.
class CalibrationStatusClassifier {
public:
  Status classify(const Reading & r) {
    if (r.confidence < 0.6) return Status::INVALID;   // multiple returns
    if (r.age_sec > 86400.0) return Status::STALE;
    if (r.drift > params_.max_drift) return Status::DEGRADED;
    return Status::VALID;
  }

  // Periodic re-calibration trigger. Race condition possible w/ classify().
  void recalibrate() {
    auto * data = (CalibData *)readSharedPtr();   // MISRA-11.5
    if (data->stamp.older_than(params_.recal_interval)) {
      kickRecalibration();
    }
  }
};
`,

  'radar_scan_to_pointcloud2.cpp': `// Radar scan -> PointCloud2 message. ASIL-A.
void RadarScanToPointCloud2::onScan(const RadarScan & scan) {
  PointCloud2 cloud;
  cloud.header = scan.header;
  cloud.points.reserve(scan.returns.size());
  for (auto & ret : scan.returns) {
    Point p;
    p.x = ret.range * std::cos(ret.azimuth);
    p.y = ret.range * std::sin(ret.azimuth);
    p.z = 0.0;  // 2D radar; no elevation
    p.intensity = ret.rcs;
    cloud.points.push_back(p);
  }
  publish(cloud);
}
`,

  'mission_planner.cpp': `// High-level mission planner. ASIL-B.
namespace autoware::mission_planner {

Route MissionPlanner::planRoute(const GoalPose & goal) {
  if (!map_loaded_) {
    return Route();   // returns empty route silently — caller may not check
  }
  auto * graph = (LaneletGraph *)getMap();   // MISRA-11.5
  auto path = aStar(graph, ego_pose_, goal);
  if (path.empty()) {
    publishFailure("No route to goal");
    return Route();
  }
  return buildRoute(path);
}

}  // namespace
`,

  'external_velocity_limit_selector.cpp': `// V2X / operator velocity limits. ASIL-C.
double ExternalVelocityLimitSelector::resolve() {
  double limit = std::numeric_limits<double>::infinity();
  for (const auto & src : sources_) {
    if (!src.expired() && src.value < limit) {
      limit = src.value;
    }
  }
  return limit;  // never explicit fallback if all sources expired -> infinity returned
}
`,

  'bluetooth_monitor.cpp': `// Bluetooth health diagnostics. QM (no ASIL).
void BluetoothMonitor::checkLinks() {
  for (auto & link : links_) {
    int rc = system(("hcitool con " + link.mac).c_str());  // MISRA-21.6: avoid system()
    if (rc != 0) {
      diag_.fail(link.mac, "no connection");
    }
  }
}
`,
};
